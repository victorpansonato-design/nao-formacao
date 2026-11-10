"""Gera apenas dados sintéticos, sem dependências externas."""
from pathlib import Path
import json
from datetime import date, timedelta
ROOT = Path(__file__).resolve().parents[1]

def write(name, value):
    (ROOT / 'data' / name).write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')

origins = [
 ('ADM-D','Administração','presencial','diurno',70,30000,100),
 ('ADS-D','Análise e Desenvolvimento de Sistemas','presencial','diurno',60,60000,90),
 ('CIV-SEMI','Engenharia Civil','semipresencial','agenda',50,45000,80),
 ('DES-SEMI','Design Gráfico','semipresencial','agenda',55,35000,85),
 ('FAR-SEMI','Farmácia','semipresencial','agenda',65,50000,90),
 ('CC-SEMI','Ciência da Computação','semipresencial','agenda',80,40000,110),
 ('RH-D','Gestão de Recursos Humanos','presencial','diurno',60,65000,85),
 ('CONT-D','Ciências Contábeis','presencial','diurno',60,30000,100),
]
destinations = [
 ('BIO-D','Biomedicina','presencial','diurno',50000,48),
 ('ADM-N','Administração','presencial','noturno',30000,48),
 ('ADS-N','Análise e Desenvolvimento de Sistemas','presencial','noturno',55000,30),
 ('PROD-N','Engenharia de Produção','presencial','noturno',65000,60),
 ('RH-SEMI','Gestão de Recursos Humanos','semipresencial','agenda',30000,24),
 ('CONT-N','Ciências Contábeis','presencial','noturno',40000,48),
]
offerings=[]
for code,name,modality,shift,count,tuition,minimum in origins:
    contribution=tuition-round(tuition*.35)
    offerings.append(dict(id='DEMO-OF-'+code,courseName=name,modality=modality,unitId='DEMO-UNIT-SEDE',shift=shift,
      schedule='Encontros quinzenais aos sábados, 8h–12h (fictício)' if modality=='semipresencial' else ('Segunda a sexta, 8h–11h40 (fictício)' if shift=='diurno' else 'Segunda a sexta, 19h10–22h40 (fictício)'),
      intake='2027/1',startDate='2027-02-02',capacity=180,occupiedSeats=count,role='origin',
      tuitionCents=tuition,installmentCount=48,decision=dict(outcome='pending',version=1),
      economics=dict(periodUnit='month',variableCostPerStudentCents=tuition-contribution,avoidableFixedCostCents=contribution*minimum),
      sourceKind='synthetic'))
for code,name,modality,shift,tuition,months in destinations:
    offerings.append(dict(id='DEMO-OF-'+code,courseName=name,modality=modality,unitId='DEMO-UNIT-SEDE',shift=shift,
      schedule='Encontros quinzenais aos sábados, 8h–12h (fictício)' if modality=='semipresencial' else ('Segunda a sexta, 8h–11h40 (fictício)' if shift=='diurno' else 'Segunda a sexta, 19h10–22h40 (fictício)'),
      intake='2027/1',startDate='2027-02-02',capacity=180,occupiedSeats=25,role='destination',tuitionCents=tuition,installmentCount=months,
      decision=dict(outcome='confirmed',version=1,decidedAt='2027-01-03T10:00:00-03:00',actorId='DEMO-USER-DIR',reference='ATA-DEMO-01',reason='Confirmação fictícia para demonstração'),sourceKind='synthetic'))
for code,name,outcome in [('BIO-SEMI','Biomedicina','pending'),('DES-N','Design Gráfico','suspended')]:
    offerings.append(dict(id='DEMO-OF-'+code,courseName=name,modality='semipresencial' if code=='BIO-SEMI' else 'presencial',
      unitId='DEMO-UNIT-SEDE',shift='agenda' if code=='BIO-SEMI' else 'noturno',schedule='Agenda de demonstração',intake='2027/1',
      startDate='2027-02-02',capacity=100,occupiedSeats=20,role='blocked',tuitionCents=45000,installmentCount=48,
      decision=dict(outcome=outcome,version=1),sourceKind='synthetic'))

students=[];enrollments=[];cases=[];payments=[];evidence=[];snapshots=[]
for code,name,modality,shift,count,tuition,minimum in origins:
    for n in range(count):
        i=len(students)+1; sid=f'DEMO-ST-{i:04d}';eid=f'DEMO-EN-{i:04d}';cid=f'DEMO-CASE-{i:04d}'
        students.append(dict(id=sid,displayName=f'Aluno de demonstração {i:03d}',email=f'aluno{i:04d}@example.invalid',
          contactLabel=f'Contato fictício {i:04d}',scope=['DEMO-UNIT-SEDE'],sourceKind='synthetic',
          preferences=dict(acceptedShifts=[shift],acceptedModalities=[modality],contentOptIn=False,preferredChannel='simulated_whatsapp')))
        enrollments.append(dict(id=eid,studentId=sid,offeringId='DEMO-OF-'+code,status='valid_demo',sourceKind='synthetic'))
        cases.append(dict(id=cid,studentId=sid,enrollmentId=eid,campaignId='DEMO-CAMPAIGN-2027-1',stage='preparation',ownerId=None,
          version=1,createdAt='2027-01-04T09:00:00-03:00',nextAction=None,sourceKind='synthetic'))
        payments.append(dict(id=f'DEMO-PAY-{i:04d}',enrollmentId=eid,amountCents=30000,refundedCents=0,creditedCents=0,
          status='reconciled_demo',paidAt='2026-12-15T12:00:00-03:00',sourceKind='synthetic'))
    for j,days in enumerate([28,21,14,7,0]):
        snapshots.append(dict(id=f'DEMO-SNAP-{code}-{j}',offeringId='DEMO-OF-'+code,asOf=(date(2027,1,4)-timedelta(days=days)).isoformat(),
          countValid=max(0,count-(4-j)*4),sourceBatchId='DEMO-BATCH-01',sourceKind='synthetic'))

personas=[
 (1,'Marina Costa','Interesse alternativo explícito fora da área','Biomedicina','DEMO-OF-BIO-D'),
 (2,'Lucas Moraes','Preservar curso, mudar para noite','Administração','DEMO-OF-ADM-N'),
 (3,'Beatriz Lima','Pedido direto de devolução',None,None),
 (71,'Pedro Alves','Destino ainda não confirmado','Biomedicina','DEMO-OF-BIO-SEMI'),
 (72,'Camila Rocha','Orçamento exige alçada','Análise e Desenvolvimento de Sistemas','DEMO-OF-ADS-N'),
 (131,'Rafael Souza','Compatibilidade de agenda','Engenharia de Produção','DEMO-OF-PROD-N'),
 (132,'Júlia Martins','Sem alternativa adequada',None,None),
 (181,'Gustavo Pereira','Proposta vence antes do aceite','Design Gráfico','DEMO-OF-DES-N'),
 (236,'Letícia Santos','Última vaga disputada','Biomedicina','DEMO-OF-BIO-D'),
 (301,'Daniel Ferreira','Sem pagamento a restituir',None,None),
 (381,'Ana Oliveira','Retorno agendado e opt-out','Gestão de Recursos Humanos','DEMO-OF-RH-SEMI'),
 (441,'Thiago Ribeiro','Ajuste devolvido por divergência','Ciências Contábeis','DEMO-OF-CONT-N'),
]
scenarios=[]
for k,(i,name,goal,interest,destination) in enumerate(personas,1):
    person=students[i-1];person['displayName']=name;person['scenarioLabel']=goal
    if i==2:person['preferences']['acceptedShifts']=['noturno']
    if i==1:person['preferences']['contentOptIn']=True
    if i==301:payments[i-1]['amountCents']=0;payments[i-1]['status']='no_payment_demo'
    if interest:
        evidence.append(dict(id=f'DEMO-EV-{k:02d}',studentId=person['id'],messageId=f'CRM-DEMO-{k:02d}',at='2026-12-10T14:00:00-03:00',
          excerpt=f'Também considerei {interest}. Quero entender melhor se combina com meu objetivo.',kind='declared_alternative',
          extractionStatus='unconfirmed',sourceKind='synthetic'))
    scenarios.append(dict(id=f'SC-{k:02d}',caseId=f'DEMO-CASE-{i:04d}',name=goal,destinationId=destination,
      setup='Executar decisão oficial simulada de não formação da origem antes de liberar contato.',sourceKind='synthetic'))
scenarios[0].update(expected='Confirmar interesse atual; Biomedicina diurno elegível; usar evidência CRM-DEMO-01; criar proposta apenas após conferir rotina e orçamento.')
scenarios[1].update(expected='Destino Administração noturno pode preservar formação; confirmar modalidade e valor.')
scenarios[2].update(expected='Pedido de restituição abre fluxo diretamente, sem oferta adicional obrigatória.')
scenarios[3].update(expected='Biomedicina semi pendente não libera proposta, mesmo com interesse declarado.')
scenarios[4].update(expected='Exceção acima da alçada bloqueia aceite até aprovação e mostra custo total.')
scenarios[5].update(expected='Atualizar agenda declarada e excluir opções incompatíveis; não presumir disponibilidade.')
scenarios[6].update(expected='Registrar ausência de opção adequada e oferecer saída; não inventar curso.')
scenarios[7].update(setup='Criar proposta elegível em outro destino, avançar relógio além da validade; Design noturno permanece bloqueado.',expected='Bloquear aceite expirado e revalidar nova proposta.')
scenarios[8].update(setup='Reduzir capacidade do destino a uma vaga livre; criar duas tentativas com versões concorrentes.',expected='Uma reserva/aceite válido; segundo comando tem conflito. Simulação não garante concorrência entre computadores.')
scenarios[9].update(expected='Regularização acadêmica, sem devolução de valor zero.')
scenarios[10].update(expected='Cancelar contatos promocionais; retorno resolutivo somente conforme combinado e política.')
scenarios[11].update(expected='Suporte devolve tarefa por valor divergente; não contar como efetivado até correção e conferência.')

seed=dict(schemaVersion=1,sourceKind='synthetic',warning='DADOS FICTÍCIOS. NÃO USAR COMO RESULTADO OU BASE REAL.',
 campaign=dict(id='DEMO-CAMPAIGN-2027-1',name='Entrada 2027/1 — demonstração',phase='anticipation',decisionReferenceDate='2027-01-26',classesStartDate='2027-02-02'),
 clock=dict(now='2027-01-04T09:00:00-03:00',mode='fixed_demo'),
 units=[dict(id='DEMO-UNIT-SEDE',name='Sede — unidade fictícia de demonstração')],
 users=[dict(id='DEMO-USER-'+key,name=name,role=role) for key,name,role in [('DIR','Diretoria demo','director'),('GEST','Gestão demo','manager'),('A','Consultor Ana demo','consultant'),('B','Consultor Bruno demo','consultant'),('C','Consultor Carla demo','consultant'),('SUP','Suporte demo','support'),('FIN','Financeiro demo','finance'),('ADMIN','Admin demo','admin')]],
 offerings=offerings,students=students,enrollments=enrollments,cases=cases,payments=payments,evidence=evidence,snapshots=snapshots,
 proposals=[],approvals=[],academicTasks=[],refunds=[],interactions=[],events=[],reservations=[],followUps=[],
 policies=dict(label='Política fictícia de demonstração',version=1,leaseMinutes=15,proposalValidityHours=48,
   consultantDiscountBps=500,managerDiscountBps=1000,discountInstallments=3,destinationEadEnabled=False,
   scenarioRevenue=dict(students=500,monthlyTuitionCents=30000,months=30,baselineConversionBps=3000,scenarioConversionBps=5000)),
 presets=[dict(id='anticipation',at='2027-01-04T09:00:00-03:00'),dict(id='operation',at='2027-01-27T09:00:00-03:00'),dict(id='aftercare',at='2027-02-09T09:00:00-03:00'),dict(id='closed',at='2027-03-05T09:00:00-03:00')])
write('seed.json',seed);write('scenarios.json',scenarios)
print(f'Gerados {len(students)} alunos, {len(offerings)} ofertas e {len(scenarios)} cenários sintéticos.')
