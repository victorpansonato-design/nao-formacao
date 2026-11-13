"""Verifica o pacote de planejamento e invariantes dos dados sintéticos."""
from pathlib import Path
from collections import Counter
import json,re,math,sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]
def check(condition, message):
    if not condition: errors.append(message)
seed=json.loads((ROOT/'data/seed.json').read_text(encoding='utf-8'))
scenarios=json.loads((ROOT/'data/scenarios.json').read_text(encoding='utf-8'))
for collection in ['students','cases','enrollments','payments','offerings','evidence','snapshots']:
    rows=seed[collection];ids=[x['id'] for x in rows]
    check(len(ids)==len(set(ids)),f'IDs duplicados em {collection}')
    check(all(x.get('sourceKind')=='synthetic' for x in rows),f'Origem não sintética em {collection}')
check(len(seed['students'])==len(seed['cases'])==len(seed['enrollments'])==500,'Base deve conter 500 casos/pessoas/matrículas')
students={x['id']:x for x in seed['students']}; offerings={x['id']:x for x in seed['offerings']}; enrollments={x['id']:x for x in seed['enrollments']}
check(all(x['email'].endswith('.invalid') for x in students.values()),'Contato não fictício')
check(all(x['offeringId'] in offerings and x['studentId'] in students for x in enrollments.values()),'Matrícula com referência inválida')
check(all(x['enrollmentId'] in enrollments and x['studentId'] in students for x in seed['cases']),'Caso sem matrícula/pessoa')
check(all(x['stage']=='preparation' for x in seed['cases']),'Seed inicial deve estar antes da decisão')
check(sum(x['role']=='origin' for x in offerings.values())==8,'Esperadas 8 origens')
check(sum(x['role']=='destination' for x in offerings.values())==6,'Esperados 6 destinos')
counts=Counter(x['offeringId'] for x in enrollments.values())
for o in offerings.values():
    check(isinstance(o['tuitionCents'],int) and o['tuitionCents']>0,'Mensalidade inválida')
    check(o['occupiedSeats']<=o['capacity'],'Capacidade inválida')
    if o['role']=='origin':
        check(counts[o['id']]==o['occupiedSeats'],'Contagem divergente '+o['id'])
        snaps=[s for s in seed['snapshots'] if s['offeringId']==o['id']]
        check(max(snaps,key=lambda s:s['asOf'])['countValid']==counts[o['id']],'Snapshot divergente')
        e=o['economics'];contribution=o['tuitionCents']-e['variableCostPerStudentCents']
        check(contribution>0 and e['avoidableFixedCostCents']>0,'Economia inválida')
    elif o['role']=='destination':check(o['decision']['outcome']=='confirmed','Destino não confirmado')
check(len(scenarios)==12,'Esperados 12 cenários')
caseids={x['id'] for x in seed['cases']}
for s in scenarios:
    check(s['caseId'] in caseids,'Cenário sem caso')
    check(s['destinationId'] is None or s['destinationId'] in offerings,'Cenário sem oferta')
check(500*30000*30==450000000,'Cenário financeiro incorreto')
check((.50-.30)*500*30000*30==90000000,'Incremento nominal incorreto')
for p in ROOT.rglob('*.md'):
    if any(part in {'node_modules', '.git', 'dist', 'test-results', 'playwright-report'} for part in p.relative_to(ROOT).parts):
        continue
    for target in re.findall(r'!?\[[^\]]*\]\(([^\s)]+)(?:\s+[^)]*)?\)',p.read_text(encoding='utf-8')):
        if target.startswith(('http:','https:','mailto:','#','sandbox:')):continue
        local=target.split('#')[0]
        if local:check((p.parent/local).exists(),f'Link local inexistente: {p.relative_to(ROOT)} → {local}')
for name in ['radar-claro.svg','radar-escuro.svg','atendimento-claro.svg','atendimento-escuro.svg']:
    check((ROOT/'design/assets'/name).exists(),'Estudo visual ausente: '+name)
if errors:
    print('\n'.join(errors));sys.exit(1)
print('OK: links locais, 500 casos sintéticos, 16 ofertas, 12 cenários, snapshots e cálculos de referência.')
