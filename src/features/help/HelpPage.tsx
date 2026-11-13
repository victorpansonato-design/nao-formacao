import { Link } from 'react-router'
import { Button } from '@/shared/ui/button'
import { Callout, Page, PageHeader, Panel, PanelHeader, SimTag } from '@/shared/ui/primitives'

export default function HelpPage() {
  return (
    <Page>
      <PageHeader title="Ajuda e limites" eyebrow={<SimTag>Demonstração local</SimTag>} description="Guia dos percursos e significado dos estados do Continua." actions={<Button asChild><Link to="/demo/controle">Controle da demo</Link></Button>} />
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Panel><PanelHeader title="Percurso de continuidade" /><ol className="list-decimal space-y-3 p-5 pl-9"><li>Carregue Operação e escolha um consultor em Ver como.</li><li>Abra Atendimentos e use Atender próximo. Registre o contato fictício.</li><li>Confirme interesses do CRM e a rotina declarada na conversa atual.</li><li>Compare destinos: turma ofertada, vaga e compatibilidade são obrigatórias.</li><li>Crie a proposta. Concessões acima da alçada vão para Aprovações.</li><li>Registre aceite com evidência. Feita a troca no Lyceum, use Confirmar troca realizada no Lyceum no atendimento; o Suporte também pode concluir pelo checklist.</li></ol></Panel>
        <Panel><PanelHeader title="Percurso de devolução" /><ol className="list-decimal space-y-3 p-5 pl-9"><li>No atendimento, use Solicitar devolução. Não é necessário negociar.</li><li>O pedido cria regularização e, se houver saldo, uma devolução.</li><li>Com Suporte, conclua a regularização de saída.</li><li>O caso é encerrado quando o Suporte conclui a regularização.</li><li>Em Devoluções fica o registro do pedido. Conferência e pagamento acontecem no sistema financeiro externo.</li></ol></Panel>
        <Panel><PanelHeader title="Glossário" /><dl className="grid gap-3 p-4"><div><dt className="font-medium">Em monitoramento</dt><dd className="text-muted">Matrícula em turma ofertada.</dd></div><div><dt className="font-medium">Afetado oficial</dt><dd className="text-muted">Aluno de turma marcada como Não ofertada pela Diretoria/Gestão.</dd></div><div><dt className="font-medium">Aceite comercial</dt><dd className="text-muted">Condição aceita. Ainda aguarda execução acadêmica.</dd></div><div><dt className="font-medium">Continuidade efetivada</dt><dd className="text-muted">Troca confirmada pelo consultor no Lyceum ou conferida pelo Suporte. D+7 e D+30 exigem observações registradas.</dd></div></dl></Panel>
        <div className="grid gap-4"><Callout tone="warning" title="Limites do cenário">Base fictícia, projeção por tendência e copiloto de respostas locais. Não há modelo treinado, previsão validada, dado acadêmico real ou resultado de piloto.</Callout><Callout title="Operações simuladas">Mensagens e Lyceum são simulados; pagamentos ficam fora do Continua. Persistência local versionada. Não inserir dados reais, chaves ou informações bancárias.</Callout><Callout title="Autonomia do aluno">Interesse exige fonte e confirmação atual. Devolução segue diretamente. Descontos respeitam a política, sem critérios de vulnerabilidade, saúde ou atributos protegidos.</Callout></div>
      </div>
    </Page>
  )
}
