"""Estudos vetoriais autorais de composição; não são screenshots de aplicativo."""
from pathlib import Path
from html import escape
import base64
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'design/assets'
LOGO=base64.b64encode((OUT/'grupo-anchieta.png').read_bytes()).decode()
class Board:
 def __init__(self,dark=False,width=1600,height=1000):
  self.dark=dark;self.w=width;self.h=height
  self.c={'bg':'#0C1626' if dark else '#F4F7FB','panel':'#132137' if dark else '#FFFFFF','text':'#EDF3FC' if dark else '#14263F','muted':'#A9B9D0' if dark else '#52647C','line':'#2C405B' if dark else '#DCE5F0','blue':'#80B8FF' if dark else '#0051A0'}
  self.s=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}"><title>Continua — estudo autoral de interface com dados fictícios</title><rect width="100%" height="100%" fill="{self.c["bg"]}"/>']
 def rect(self,x,y,w,h,fill=None,r=12,stroke=None):self.s.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill or self.c["panel"]}"'+(f' stroke="{stroke}"' if stroke else '')+'/>')
 def text(self,x,y,t,size=14,color=None,weight=400):self.s.append(f'<text x="{x}" y="{y}" fill="{color or self.c["text"]}" font-family="Inter,DejaVu Sans,sans-serif" font-size="{size}" font-weight="{weight}">{escape(t)}</text>')
 def line(self,x1,y1,x2,y2,color=None):self.s.append(f'<path d="M{x1} {y1}H{x2}" stroke="{color or self.c["line"]}"/>' if y1==y2 else f'<path d="M{x1} {y1}L{x2} {y2}" stroke="{color or self.c["line"]}"/>')
 def badge(self,x,y,t,fill='#E9F2FD',color='#0051A0',w=None):
  self.rect(x,y,w or len(t)*7+22,26,fill,6);self.text(x+10,y+18,t,12,color,600)
 def sidebar(self):
  self.rect(0,0,232,self.h,'#133A9E',0)
  self.s.append(f'<image href="data:image/png;base64,{LOGO}" x="26" y="26" width="174" height="62"/>')
  self.text(26,128,'Continua',25,'#FFFFFF',600);self.text(26,151,'Grupo Anchieta',12,'#CFDFFF')
  nav=['Visão geral','Radar de ofertas','Alunos','Atendimentos','Comunicação','Ajustes acadêmicos','Devoluções','Resultados']
  for i,n in enumerate(nav):
   y=194+i*49
   if (i==1 and self.kind=='radar') or (i==3 and self.kind=='atendimento'):self.rect(14,y-24,204,39,'#3157AE',8)
   self.rect(28,y-13,13,13,'none',3,'#C4D5FF');self.text(54,y,n,14,'#FFFFFF' if i in [1,3] else '#CFDFFF',500)
  self.line(24,self.h-130,208,self.h-130,'#3A59A7')
  self.text(26,self.h-99,'Ambiente de demonstração',11,'#D7E4FF')
  self.text(26,self.h-66,'Gestão / CX',14,'#FFFFFF',600);self.text(26,self.h-43,'Ver como outro perfil',11,'#D7E4FF')
 def top(self,date):
  self.rect(232,0,self.w-232,70,r=0);self.line(232,70,self.w,70)
  self.text(264,42,'Entrada 2027/1',14,weight=600);self.text(448,42,'Sede e polos',13,self.c['muted'])
  self.rect(1010,19,294,34,self.c['bg'],8);self.text(1026,41,'Buscar aluno, oferta ou tarefa',12,self.c['muted'])
  self.badge(1330,23,'Simulação',w=98);self.text(1440,42,date,12,self.c['muted'])
 def save(self,name):
  self.s.append('</svg>');(OUT/name).write_text('\n'.join(self.s))
 def radar(self):
  self.kind='radar';self.sidebar();self.top('04 jan 2027')
  self.text(272,126,'Antecipar para dar continuidade',29,weight=600)
  self.text(272,154,'Demanda, sustentabilidade e decisão, com evidências separadas.',14,self.c['muted'])
  self.rect(1362,102,206,40,self.c['blue'],8);self.text(1382,128,'Revisar decisões',14,'#0C1626' if self.dark else '#FFFFFF',600)
  self.rect(272,181,1296,40,'#192F52' if self.dark else '#E8F0FB',8)
  self.text(288,207,'Próxima decisão de referência: 26/01 • Aulas: 02/02 • Projeção ainda não é confirmação de turma.',13,self.c['blue'])
  metrics=[('Ofertas em monitoramento','8','Presencial e semipresencial'),('Alunos em preparação','500','Ainda sem decisão de não formação'),('Destinos confirmados','6','Verificar agenda, vaga e condição'),('Afetados oficiais','0','Antes da decisão')]
  for i,(a,b,c) in enumerate(metrics):
   x=272+i*330;self.rect(x,245,306,102,stroke=self.c['line']);self.text(x+18,272,a,12,self.c['muted']);self.text(x+18,307,b,30,weight=600);self.text(x+18,331,c,11,self.c['muted'])
  self.rect(272,371,844,290,stroke=self.c['line']);self.text(294,404,'Administração · Presencial diurno',17,weight=600)
  self.text(294,429,'Trajetória observada e cenário de tendência',12,self.c['muted'])
  for y,t in [(470,'100'),(520,'75'),(570,'50'),(620,'25')]:self.line(333,y,1085,y);self.text(295,y+4,t,11,self.c['muted'])
  self.s.append(f'<path d="M770 530L1030 480L1030 552L770 530Z" fill="{self.c["blue"]}" opacity=".12"/>')
  self.s.append(f'<path d="M350 600L460 580L560 563L665 545L770 530" fill="none" stroke="{self.c["blue"]}" stroke-width="3"/>')
  self.s.append(f'<path d="M770 530L1030 505" fill="none" stroke="{self.c["blue"]}" stroke-width="3" stroke-dasharray="6 5"/>')
  self.line(1030,452,1030,627,'#B18430');self.text(957,650,'Decisão 26/01',11,self.c['muted'])
  self.text(348,650,'07 dez',11,self.c['muted']);self.text(718,650,'04 jan',11,self.c['muted'])
  self.rect(1140,371,428,290,stroke=self.c['line']);self.text(1162,404,'O que precisa de atenção',17,weight=600)
  self.badge(1162,423,'Cenário abaixo da referência','#FFF2D3','#815200',246)
  for y,a,b in [(480,'Matrículas atuais','70'),(517,'Projeção base','83'),(554,'Referência econômica','100')]:self.text(1162,y,a,13,self.c['muted']);self.text(1500,y,b,17,weight=600)
  self.line(1162,577,1546,577);self.text(1162,603,'Faixa de cenário: 77–89 alunos',13);self.text(1162,628,'Valores fictícios; faixa não probabilística.',11,self.c['muted'])
  self.text(272,704,'Ofertas que exigem revisão',19,weight=600);self.text(1296,704,'Filtrar por unidade e modalidade',12,self.c['blue'])
  self.rect(272,724,1296,212,stroke=self.c['line']);self.rect(273,725,1294,37,self.c['bg'],10)
  for x,t in [(292,'Oferta'),(792,'Atuais'),(895,'Cenário base'),(1058,'Referência'),(1212,'Decisão'),(1430,'Atualização')]:self.text(x,749,t,12,self.c['muted'],500)
  rows=[('Administração · Sede · Diurno','70','83','100'),('ADS · Sede · Diurno','60','73','90'),('Engenharia Civil · Semi · Sede','50','63','80')]
  for i,(n,a,p,r) in enumerate(rows):
   y=795+i*54
   if i:self.line(292,y-29,1548,y-29)
   self.text(292,y,n,14,weight=500);self.text(800,y,a,14);self.text(920,y,p,14);self.text(1086,y,r,14);self.badge(1212,y-18,'Pendente','#EEF2F7','#52647C',100);self.text(1432,y,'04/01, 09h',12,self.c['muted'])
  self.text(272,971,'Estudo autoral de composição • Dados e ofertas inteiramente fictícios • Não é screenshot de sistema implementado.',11,self.c['muted'])
 def atendimento(self):
  self.kind='atendimento';self.sidebar();self.top('27 jan 2027')
  self.text(264,111,'Atendimento',22,weight=600);self.text(1230,110,'Caso DEMO-0001 • Ana demo',12,self.c['muted'])
  self.rect(256,135,260,792,stroke=self.c['line']);self.text(276,169,'Marina Costa',19,weight=600);self.text(276,194,'Pessoa fictícia de demonstração',11,self.c['muted'])
  self.badge(276,212,'Em atendimento',w=154);self.text(276,272,'Origem',12,self.c['muted']);self.text(276,297,'Administração',16,weight=600);self.text(276,320,'Presencial · Diurno · Sede',12,self.c['muted'])
  self.line(276,344,495,344);self.text(276,374,'O que ela quer preservar',13,weight=600)
  for y,t in [(404,'Estudar de manhã'),(432,'Avaliar área da saúde'),(460,'Confirmar orçamento')]:self.text(276,y,t,13,self.c['muted'])
  self.rect(272,496,228,145,'#1A3152' if self.dark else '#F0F5FD',8);self.text(286,522,'Evidência do CRM',13,self.c['blue'],600)
  for y,t in [(550,'“Também considerei'),(573,'Biomedicina antes de'),(596,'escolher Administração.”')]:self.text(286,y,t,13)
  self.text(286,625,'CRM-DEMO-01 • 10/12/2026',10,self.c['muted'])
  self.text(276,686,'Próximo passo',12,self.c['muted']);self.text(276,710,'Confirmar interesse atual',13,weight=500);self.text(276,745,'Ver jornada completa',13,self.c['blue'])
  self.rect(536,135,620,792,stroke=self.c['line']);self.text(558,168,'Conversa',16,weight=600);self.text(1000,168,'WhatsApp simulado',11,self.c['muted']);self.line(536,188,1156,188)
  self.text(772,219,'Hoje, 27 de janeiro',11,self.c['muted'])
  self.rect(558,244,522,149,'#1C3454' if self.dark else '#EBF3FF',12)
  for y,t in [(271,'Marina, a turma de Administração diurno não será'),(294,'ofertada nesta entrada. Sinto muito pela mudança'),(317,'no seu planejamento. Posso ajudar a avaliar uma'),(340,'alternativa ou encaminhar sua regularização e'),(363,'devolução. Como prefere seguir?')]:self.text(574,y,t,13)
  self.text(574,382,'Ana • Mensagem demonstrativa',10,self.c['muted'])
  self.rect(615,418,517,97,self.c['bg'],12)
  for y,t in [(447,'Eu também tinha interesse em Biomedicina.'),(471,'Mas preciso continuar estudando de manhã.')]:self.text(633,y,t,14)
  self.text(633,499,'Marina • Resposta fictícia',10,self.c['muted'])
  self.rect(558,542,522,81,'#1C3454' if self.dark else '#EBF3FF',12)
  self.text(574,571,'Biomedicina ainda faz sentido para você?',14);self.text(574,596,'Posso comparar a formação, a rotina e os valores.',14)
  self.text(558,673,'Nota interna: conferir agenda e orçamento antes da proposta.',12,self.c['muted'])
  self.rect(554,725,584,128,self.c['bg'],10,self.c['line']);self.text(570,754,'Escreva uma mensagem de demonstração…',13,self.c['muted'])
  self.rect(906,804,216,35,self.c['blue'],7);self.text(923,827,'Registrar mensagem',13,'#0C1626' if self.dark else '#FFFFFF',600)
  self.text(558,893,'Agendar retorno',12,self.c['blue']);self.text(752,893,'Registrar ligação',12,self.c['blue']);self.text(968,893,'Solicitar devolução',12,self.c['blue'])
  self.rect(1176,135,400,792,stroke=self.c['line']);self.text(1198,169,'Copiloto de continuidade',18,weight=600);self.badge(1198,185,'Modo simulado',w=138)
  self.text(1198,246,'Agora, confirme a preferência',14,weight=600)
  for y,t in [(274,'O interesse em saúde foi declarado.'),(297,'A rotina diurna deve ser preservada.'),(320,'Preço e agenda ainda precisam de acordo.')]:self.text(1198,y,t,12,self.c['muted'])
  self.text(1198,366,'Alternativa elegível',14,weight=600);self.rect(1192,383,368,233,self.c['bg'],10,self.c['line']);self.text(1208,413,'Biomedicina',19,weight=600)
  self.badge(1208,430,'Turma confirmada','#DCF4E7','#146C43',172)
  self.text(1208,483,'Presencial · Diurno · Sede',13);self.text(1208,510,'Interesse declarado + horário compatível',11,self.c['muted']);self.text(1208,537,'Conferir preço, duração e condições.',12,self.c['muted'])
  self.rect(1208,561,332,36,self.c['blue'],7);self.text(1302,585,'Comparar cursos',13,'#0C1626' if self.dark else '#FFFFFF',600)
  self.text(1198,659,'O que ainda perguntar',14,weight=600);self.text(1198,688,'Qual valor cabe no seu planejamento?',12,self.c['muted']);self.text(1198,731,'Simular possíveis respostas',13,self.c['blue']);self.text(1198,777,'Por que esta sugestão?',13,self.c['blue'])
  self.rect(1194,823,364,76,'#1A3152' if self.dark else '#EDF3FC',8);self.text(1208,849,'O consultor revisa e decide o envio.',12,self.c['blue']);self.text(1208,873,'Nenhuma mensagem sai desta demonstração.',10,self.c['muted'])
  self.text(256,971,'Estudo autoral de composição • Dados fictícios • A aplicação funcional será construída no VS Code.',11,self.c['muted'])

for name,dark in [('radar-claro.svg',False),('radar-escuro.svg',True)]:
 b=Board(dark);b.radar();b.save(name)
b=Board();b.atendimento();b.save('atendimento-claro.svg')
b=Board(True);b.atendimento();b.save('atendimento-escuro.svg')
print('Quatro estudos SVG autorais gerados.')
