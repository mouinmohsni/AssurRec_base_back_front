import { QueryTypes } from "sequelize";
import { sequelize } from "../config/database.js";

// Ces agrégats SQL sont volontairement isolés ; le CRUD reste assuré par les modèles.
export async function readDashboard({ from, to, insuranceType, agentId }) {
  const insurance = insuranceType ? " AND c.insurance_type=:insuranceType" : "";
  const caseScope = agentId
    ? " AND EXISTS (SELECT 1 FROM recovery_cases rcs WHERE rcs.installment_id=x.id AND rcs.agent_id=:agentId)"
    : "";
  const agentScope = agentId ? " AND rc.agent_id=:agentId" : "";
  const replacements = {
    from,
    to,
    insuranceType: insuranceType ?? null,
    agentId: agentId ?? null,
  };
  const query = (sql) =>
    sequelize.query(sql, { type: QueryTypes.SELECT, replacements });
  const summary = await query(`
    SELECT COALESCE(SUM(x.amount_milli),0) expected,
      COALESCE(SUM(paid.total),0) collectedCurrent,
      COUNT(CASE WHEN x.due_date<UTC_DATE() AND x.amount_milli-COALESCE(paid.total,0)>0 THEN 1 END) overdue
    FROM installments x JOIN contracts c ON c.id=x.contract_id
    LEFT JOIN (SELECT installment_id,SUM(amount_milli) total FROM payments WHERE status='valide' GROUP BY installment_id) paid ON paid.installment_id=x.id
    WHERE x.due_date BETWEEN :from AND :to${insurance}${caseScope}`);
  const collected = await query(`
    SELECT COALESCE(SUM(p.amount_milli),0) total
    FROM payments p JOIN installments x ON x.id=p.installment_id JOIN contracts c ON c.id=x.contract_id
    WHERE p.status='valide' AND p.paid_at BETWEEN :from AND :to${insurance}${caseScope}`);
  const active = await query(`
    SELECT COUNT(*) total FROM recovery_cases rc JOIN installments x ON x.id=rc.installment_id JOIN contracts c ON c.id=x.contract_id
    WHERE rc.status<>'cloture' AND x.due_date BETWEEN :from AND :to${insurance}${agentScope}`);
  const expectedMonths = await query(`
    SELECT DATE_FORMAT(x.due_date,'%Y-%m') month,SUM(x.amount_milli) expectedMilli
    FROM installments x JOIN contracts c ON c.id=x.contract_id
    WHERE x.due_date BETWEEN :from AND :to${insurance}${caseScope}
    GROUP BY DATE_FORMAT(x.due_date,'%Y-%m') ORDER BY month`);
  const collectedMonths = await query(`
    SELECT DATE_FORMAT(p.paid_at,'%Y-%m') month,SUM(p.amount_milli) collectedMilli
    FROM payments p JOIN installments x ON x.id=p.installment_id JOIN contracts c ON c.id=x.contract_id
    WHERE p.status='valide' AND p.paid_at BETWEEN :from AND :to${insurance}${caseScope}
    GROUP BY DATE_FORMAT(p.paid_at,'%Y-%m') ORDER BY month`);
  const aging = await query(`
    SELECT CASE WHEN DATEDIFF(UTC_DATE(),x.due_date) BETWEEN 1 AND 30 THEN '1–30 jours'
      WHEN DATEDIFF(UTC_DATE(),x.due_date) BETWEEN 31 AND 60 THEN '31–60 jours'
      WHEN DATEDIFF(UTC_DATE(),x.due_date) BETWEEN 61 AND 90 THEN '61–90 jours' ELSE 'Plus de90 jours' END label,
      COALESCE(SUM(x.amount_milli-COALESCE(paid.total,0)),0) amountMilli,COUNT(*) count
    FROM installments x JOIN contracts c ON c.id=x.contract_id
    LEFT JOIN (SELECT installment_id,SUM(amount_milli) total FROM payments WHERE status='valide' GROUP BY installment_id) paid ON paid.installment_id=x.id
    WHERE x.due_date<UTC_DATE() AND x.due_date BETWEEN :from AND :to AND x.amount_milli-COALESCE(paid.total,0)>0${insurance}${caseScope}
    GROUP BY label ORDER BY MIN(x.due_date)`);
  const statuses = await query(`
    SELECT rc.status,COUNT(*) count FROM recovery_cases rc JOIN installments x ON x.id=rc.installment_id JOIN contracts c ON c.id=x.contract_id
    WHERE x.due_date BETWEEN :from AND :to${insurance}${agentScope} GROUP BY rc.status`);
  const priority = await query(`
    SELECT rc.id,rc.reference,rc.installment_id AS installmentId,x.reference AS installmentReference,
      i.id AS insuredId,i.name AS insuredName,c.reference AS contractReference,c.insurance_type AS insuranceType,
      rc.agent_id AS agentId,u.name AS agentName,rc.status,rc.priority,rc.opened_at AS openedAt,
      rc.promise_date AS promiseDate,rc.notes,x.amount_milli AS amountMilli,
      COALESCE((SELECT SUM(p.amount_milli) FROM payments p WHERE p.installment_id=x.id AND p.status='valide'),0) AS paidMilli,x.due_date AS dueDate
    FROM recovery_cases rc JOIN installments x ON x.id=rc.installment_id JOIN contracts c ON c.id=x.contract_id
      JOIN insureds i ON i.id=c.insured_id LEFT JOIN users u ON u.id=rc.agent_id
    WHERE rc.status<>'cloture' AND x.due_date BETWEEN :from AND :to${insurance}${agentScope}
    ORDER BY CASE rc.priority WHEN 'haute' THEN 1 WHEN 'normale' THEN 2 ELSE 3 END,rc.id DESC LIMIT 10`);
  const recent = await query(`
    SELECT p.id,p.reference,p.installment_id AS installmentId,x.reference AS installmentReference,
      i.name AS insuredName,p.case_id AS caseId,p.amount_milli AS amountMilli,p.paid_at AS paidAt,p.method,p.status,
      p.recorded_by AS recordedBy,u.name AS recordedByName,p.reversal_reason AS reversalReason,p.created_at AS createdAt
    FROM payments p JOIN installments x ON x.id=p.installment_id JOIN contracts c ON c.id=x.contract_id
      JOIN insureds i ON i.id=c.insured_id JOIN users u ON u.id=p.recorded_by
    WHERE p.status='valide' AND p.paid_at BETWEEN :from AND :to${insurance}${caseScope} ORDER BY p.id DESC LIMIT 10`);
  return {
    summary: summary[0],
    collected: collected[0],
    active: active[0],
    expectedMonths,
    collectedMonths,
    aging,
    statuses,
    priority,
    recent,
  };
}
