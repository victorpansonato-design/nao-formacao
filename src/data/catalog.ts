import type { Modality, Shift } from '@/domain/types'

/**
 * Catálogo real de graduação do UniAnchieta: cursos, formatos e turnos públicos.
 * Fonte: https://anchieta.br/graduacao/ (listagem oficial e a página de cada curso), coletado em 12/11/2026.
 * Só nome, diploma, formato, turno e selo "Novo" vêm do site. Vagas, mensalidades, matrículas e alunos
 * continuam sintéticos (src/data/seed.ts). ARQUIVO GERADO: não editar à mão.
 * Para atualizar: python scripts/fetch_catalog.py (regras e limites em docs/15-catalogo-real.md).
 */
export interface CatalogCourse {
  name: string
  slug: string
  degree: 'Bacharelado' | 'Tecnólogo' | 'Licenciatura'
  /** Selo "Novo" exibido na listagem do site. */
  isNew: boolean
  formats: { modality: Modality; shifts: Shift[] }[]
}

export const CATALOG_COURSES: CatalogCourse[] = [
  { name: 'Administração', slug: 'administracao', degree: 'Bacharelado', isNew: false, formats: [{ modality: 'presencial', shifts: ['diurno', 'noturno'] }, { modality: 'semipresencial', shifts: ['agenda'] }, { modality: 'ead', shifts: ['online'] }] },
  { name: 'Agrocomputação', slug: 'agrocomputacao', degree: 'Tecnólogo', isNew: true, formats: [{ modality: 'semipresencial', shifts: ['agenda'] }, { modality: 'ead', shifts: ['online'] }] },
  { name: 'AI Creative Design', slug: 'ai-creative-design', degree: 'Tecnólogo', isNew: true, formats: [{ modality: 'ead', shifts: ['online'] }] },
  { name: 'Análise e Desenvolvimento de Sistemas', slug: 'analise-e-desenvolvimento-de-sistemas', degree: 'Tecnólogo', isNew: false, formats: [{ modality: 'presencial', shifts: ['diurno', 'noturno'] }, { modality: 'semipresencial', shifts: ['agenda'] }, { modality: 'ead', shifts: ['online'] }, { modality: 'ead_live', shifts: ['online'] }] },
  { name: 'Arquitetura e Urbanismo', slug: 'arquitetura-e-urbanismo', degree: 'Bacharelado', isNew: false, formats: [{ modality: 'presencial', shifts: ['diurno', 'noturno'] }] },
  { name: 'Automação Industrial', slug: 'automacao-industrial', degree: 'Tecnólogo', isNew: true, formats: [{ modality: 'semipresencial', shifts: ['agenda'] }] },
  { name: 'Banco de Dados', slug: 'banco-de-dados', degree: 'Tecnólogo', isNew: true, formats: [{ modality: 'presencial', shifts: ['noturno'] }, { modality: 'semipresencial', shifts: ['agenda'] }] },
  { name: 'Biblioteconomia', slug: 'biblioteconomia', degree: 'Bacharelado', isNew: true, formats: [{ modality: 'ead', shifts: ['online'] }] },
  { name: 'Big Data e Inteligência Analítica 4.0', slug: 'big-data-e-inteligencia-analitica-4-0', degree: 'Tecnólogo', isNew: false, formats: [{ modality: 'ead', shifts: ['online'] }] },
  { name: 'Biomedicina', slug: 'biomedicina', degree: 'Bacharelado', isNew: false, formats: [{ modality: 'presencial', shifts: ['diurno', 'noturno'] }, { modality: 'presencial_integral', shifts: ['integral'] }, { modality: 'semipresencial', shifts: ['agenda'] }] },
  { name: 'Biotecnologia', slug: 'biotecnologia', degree: 'Tecnólogo', isNew: true, formats: [{ modality: 'semipresencial', shifts: ['agenda'] }] },
  { name: 'Ciência da Computação', slug: 'ciencia-da-computacao', degree: 'Bacharelado', isNew: false, formats: [{ modality: 'presencial', shifts: ['diurno', 'noturno'] }, { modality: 'semipresencial', shifts: ['agenda'] }, { modality: 'ead', shifts: ['online'] }] },
  { name: 'Ciência de Dados e IA', slug: 'ciencia-de-dados-e-ia', degree: 'Bacharelado', isNew: true, formats: [{ modality: 'ead', shifts: ['online'] }] },
  { name: 'Ciência Política', slug: 'ciencia-politica', degree: 'Bacharelado', isNew: true, formats: [{ modality: 'ead', shifts: ['online'] }] },
  { name: 'Ciências Biológicas Bacharelado', slug: 'ciencias-biologicas-bacharelado', degree: 'Bacharelado', isNew: false, formats: [{ modality: 'semipresencial', shifts: ['agenda'] }] },
  { name: 'Ciências Biológicas Licenciatura', slug: 'ciencias-biologicas-licenciatura', degree: 'Licenciatura', isNew: true, formats: [{ modality: 'semipresencial', shifts: ['agenda'] }] },
  { name: 'Ciências Contábeis', slug: 'ciencias-contabeis', degree: 'Bacharelado', isNew: false, formats: [{ modality: 'presencial', shifts: ['noturno'] }, { modality: 'semipresencial', shifts: ['agenda'] }, { modality: 'ead', shifts: ['online'] }] },
  { name: 'Ciências Econômicas', slug: 'ciencias-economicas', degree: 'Bacharelado', isNew: false, formats: [{ modality: 'presencial', shifts: ['noturno'] }, { modality: 'semipresencial', shifts: ['agenda'] }, { modality: 'ead', shifts: ['online'] }] },
  { name: 'Comércio Exterior', slug: 'comercio-exterior', degree: 'Tecnólogo', isNew: false, formats: [{ modality: 'semipresencial', shifts: ['agenda'] }, { modality: 'ead', shifts: ['online'] }] },
  { name: 'Creator e Digital Influencer', slug: 'creator-e-digital-influencer', degree: 'Tecnólogo', isNew: true, formats: [{ modality: 'semipresencial', shifts: ['agenda'] }, { modality: 'ead_live', shifts: ['online'] }] },
  { name: 'Desenvolvimento Mobile', slug: 'desenvolvimento-mobile', degree: 'Tecnólogo', isNew: true, formats: [{ modality: 'ead', shifts: ['online'] }] },
  { name: 'Design de Animação em IA', slug: 'design-de-animacao-em-ia', degree: 'Tecnólogo', isNew: true, formats: [{ modality: 'ead', shifts: ['online'] }] },
  { name: 'Design de Interiores', slug: 'design-de-interiores', degree: 'Tecnólogo', isNew: true, formats: [{ modality: 'semipresencial', shifts: ['agenda'] }, { modality: 'ead', shifts: ['online'] }] },
  { name: 'Design Gráfico', slug: 'design-grafico', degree: 'Tecnólogo', isNew: false, formats: [{ modality: 'presencial', shifts: ['noturno'] }, { modality: 'semipresencial', shifts: ['agenda'] }, { modality: 'ead', shifts: ['online'] }] },
  { name: 'Direito', slug: 'direito', degree: 'Bacharelado', isNew: false, formats: [{ modality: 'presencial', shifts: ['diurno'] }, { modality: 'presencial_intensivo', shifts: ['agenda'] }] },
  { name: 'Educação Física Bacharelado', slug: 'educacao-fisica-bacharelado', degree: 'Bacharelado', isNew: false, formats: [{ modality: 'presencial', shifts: ['diurno', 'noturno'] }, { modality: 'semipresencial', shifts: ['agenda'] }] },
  { name: 'Educação Física Licenciatura', slug: 'educacao-fisica-licenciatura', degree: 'Licenciatura', isNew: false, formats: [{ modality: 'semipresencial', shifts: ['agenda'] }] },
  { name: 'Energias Renováveis', slug: 'energias-renovaveis', degree: 'Tecnólogo', isNew: true, formats: [{ modality: 'semipresencial', shifts: ['agenda'] }] },
  { name: 'Enfermagem', slug: 'enfermagem', degree: 'Bacharelado', isNew: false, formats: [{ modality: 'presencial_integral', shifts: ['diurno', 'noturno'] }, { modality: 'presencial_intensivo', shifts: ['agenda'] }] },
  { name: 'Engenharia Biomédica', slug: 'engenharia-biomedica', degree: 'Bacharelado', isNew: true, formats: [{ modality: 'presencial', shifts: ['noturno'] }] },
  { name: 'Engenharia Civil', slug: 'engenharia-civil', degree: 'Bacharelado', isNew: false, formats: [{ modality: 'presencial', shifts: ['diurno', 'noturno'] }, { modality: 'semipresencial', shifts: ['agenda'] }] },
  { name: 'Engenharia da Computação', slug: 'engenharia-da-computacao', degree: 'Bacharelado', isNew: true, formats: [{ modality: 'semipresencial', shifts: ['agenda'] }] },
  { name: 'Engenharia de Controle e Automação', slug: 'engenharia-de-controle-e-automacao', degree: 'Bacharelado', isNew: false, formats: [{ modality: 'semipresencial', shifts: ['agenda'] }] },
  { name: 'Engenharia de Produção', slug: 'engenharia-de-producao', degree: 'Bacharelado', isNew: false, formats: [{ modality: 'presencial', shifts: ['diurno', 'noturno'] }, { modality: 'semipresencial', shifts: ['agenda'] }] },
  { name: 'Engenharia de Software', slug: 'engenharia-de-software', degree: 'Bacharelado', isNew: false, formats: [{ modality: 'presencial', shifts: ['noturno'] }, { modality: 'semipresencial', shifts: ['agenda'] }, { modality: 'ead', shifts: ['online'] }] },
  { name: 'Engenharia Elétrica', slug: 'engenharia-eletrica', degree: 'Bacharelado', isNew: false, formats: [{ modality: 'presencial', shifts: ['diurno', 'noturno'] }, { modality: 'semipresencial', shifts: ['agenda'] }] },
  { name: 'Engenharia em Inteligência Artificial', slug: 'engenharia-em-inteligencia-artificial', degree: 'Bacharelado', isNew: true, formats: [{ modality: 'presencial', shifts: ['noturno'] }] },
  { name: 'Engenharia Mecânica', slug: 'engenharia-mecanica', degree: 'Bacharelado', isNew: false, formats: [{ modality: 'presencial', shifts: ['noturno'] }, { modality: 'semipresencial', shifts: ['agenda'] }] },
  { name: 'Engenharia Química', slug: 'engenharia-quimica', degree: 'Bacharelado', isNew: false, formats: [{ modality: 'presencial', shifts: ['diurno', 'noturno'] }] },
  { name: 'Estética e Cosmética', slug: 'estetica-e-cosmetica', degree: 'Tecnólogo', isNew: false, formats: [{ modality: 'presencial', shifts: ['noturno'] }, { modality: 'semipresencial', shifts: ['agenda'] }] },
  { name: 'Farmácia', slug: 'farmacia', degree: 'Bacharelado', isNew: false, formats: [{ modality: 'presencial', shifts: ['diurno', 'noturno'] }, { modality: 'semipresencial', shifts: ['agenda'] }] },
  { name: 'Filosofia', slug: 'filosofia', degree: 'Bacharelado', isNew: true, formats: [{ modality: 'ead', shifts: ['online'] }] },
  { name: 'Fisioterapia', slug: 'fisioterapia', degree: 'Bacharelado', isNew: false, formats: [{ modality: 'presencial', shifts: ['diurno', 'noturno'] }, { modality: 'presencial_integral', shifts: ['integral'] }, { modality: 'semipresencial', shifts: ['agenda'] }] },
  { name: 'Fonoaudiologia', slug: 'fonoaudiologia', degree: 'Bacharelado', isNew: false, formats: [{ modality: 'presencial', shifts: ['diurno', 'noturno'] }, { modality: 'semipresencial', shifts: ['agenda'] }] },
  { name: 'Gastronomia', slug: 'gastronomia', degree: 'Tecnólogo', isNew: true, formats: [{ modality: 'semipresencial', shifts: ['agenda'] }] },
  { name: 'Gestão Comercial', slug: 'gestao-comercial', degree: 'Tecnólogo', isNew: false, formats: [{ modality: 'ead', shifts: ['online'] }] },
  { name: 'Gestão da Produção Industrial', slug: 'gestao-da-producao-industrial', degree: 'Tecnólogo', isNew: false, formats: [{ modality: 'ead', shifts: ['online'] }] },
  { name: 'Gestão da Qualidade', slug: 'gestao-de-qualidade', degree: 'Tecnólogo', isNew: false, formats: [{ modality: 'ead', shifts: ['online'] }] },
  { name: 'Gestão da Tecnologia da Informação', slug: 'gestao-da-tecnologia-da-informacao', degree: 'Tecnólogo', isNew: false, formats: [{ modality: 'ead', shifts: ['online'] }] },
  { name: 'Gestão de Eventos', slug: 'gestao-de-eventos', degree: 'Tecnólogo', isNew: false, formats: [{ modality: 'ead', shifts: ['online'] }] },
  { name: 'Gestão de Negócios Imobiliários', slug: 'gestao-de-negocios-imobiliarios', degree: 'Tecnólogo', isNew: false, formats: [{ modality: 'ead', shifts: ['online'] }] },
  { name: 'Gestão de Recursos Humanos', slug: 'gestao-de-recursos-humanos', degree: 'Tecnólogo', isNew: false, formats: [{ modality: 'presencial', shifts: ['noturno'] }, { modality: 'semipresencial', shifts: ['agenda'] }, { modality: 'ead', shifts: ['online'] }] },
  { name: 'Gestão de Turismo', slug: 'gestao-de-turismo', degree: 'Tecnólogo', isNew: true, formats: [{ modality: 'ead', shifts: ['online'] }] },
  { name: 'Gestão Financeira', slug: 'gestao-financeira', degree: 'Tecnólogo', isNew: false, formats: [{ modality: 'ead', shifts: ['online'] }] },
  { name: 'Gestão Pública', slug: 'gestao-publica', degree: 'Tecnólogo', isNew: false, formats: [{ modality: 'ead', shifts: ['online'] }] },
  { name: 'Inteligência Artificial e Automação Inteligente', slug: 'inteligencia-artificial-e-automacao-inteligente', degree: 'Tecnólogo', isNew: true, formats: [{ modality: 'semipresencial', shifts: ['agenda'] }, { modality: 'ead', shifts: ['online'] }] },
  { name: 'Internet das Coisas (IoT)', slug: 'internet-das-coisas-iot', degree: 'Tecnólogo', isNew: true, formats: [{ modality: 'ead', shifts: ['online'] }] },
  { name: 'Jogos Digitais', slug: 'jogos-digitais', degree: 'Tecnólogo', isNew: true, formats: [{ modality: 'ead', shifts: ['online'] }] },
  { name: 'Letras Português', slug: 'letras-portugues', degree: 'Licenciatura', isNew: false, formats: [{ modality: 'semipresencial', shifts: ['agenda'] }] },
  { name: 'Logística', slug: 'logistica', degree: 'Tecnólogo', isNew: false, formats: [{ modality: 'presencial', shifts: ['noturno'] }, { modality: 'semipresencial', shifts: ['agenda'] }, { modality: 'ead', shifts: ['online'] }] },
  { name: 'Marketing', slug: 'marketing', degree: 'Tecnólogo', isNew: false, formats: [{ modality: 'ead', shifts: ['online'] }] },
  { name: 'Medicina Veterinária', slug: 'medicina-veterinaria', degree: 'Bacharelado', isNew: false, formats: [{ modality: 'presencial', shifts: ['diurno', 'noturno'] }, { modality: 'presencial_integral', shifts: ['integral'] }] },
  { name: 'Mídias Sociais Digitais', slug: 'midias-sociais-digitais', degree: 'Tecnólogo', isNew: true, formats: [{ modality: 'ead', shifts: ['online'] }] },
  { name: 'Nutrição', slug: 'nutricao', degree: 'Bacharelado', isNew: false, formats: [{ modality: 'presencial', shifts: ['diurno', 'noturno'] }, { modality: 'semipresencial', shifts: ['agenda'] }] },
  { name: 'Odontologia', slug: 'odontologia', degree: 'Bacharelado', isNew: false, formats: [{ modality: 'presencial', shifts: ['diurno', 'noturno'] }] },
  { name: 'Oftálmica', slug: 'oftalmica', degree: 'Tecnólogo', isNew: false, formats: [{ modality: 'semipresencial', shifts: ['agenda'] }] },
  { name: 'Pedagogia', slug: 'pedagogia-licenciatura', degree: 'Licenciatura', isNew: false, formats: [{ modality: 'presencial', shifts: ['noturno'] }, { modality: 'semipresencial', shifts: ['agenda'] }] },
  { name: 'Pedagogia Bilíngue', slug: 'pedagogia-bilingue-licenciatura', degree: 'Licenciatura', isNew: true, formats: [{ modality: 'semipresencial', shifts: ['agenda'] }] },
  { name: 'Podologia', slug: 'podologia', degree: 'Tecnólogo', isNew: false, formats: [{ modality: 'semipresencial', shifts: ['agenda'] }] },
  { name: 'Processos Gerenciais', slug: 'processos-gerenciais', degree: 'Tecnólogo', isNew: false, formats: [{ modality: 'ead', shifts: ['online'] }] },
  { name: 'Produção Multimídia', slug: 'producao-multimidia', degree: 'Tecnólogo', isNew: false, formats: [{ modality: 'presencial', shifts: ['noturno'] }, { modality: 'semipresencial', shifts: ['agenda'] }] },
  { name: 'Psicologia', slug: 'psicologia', degree: 'Bacharelado', isNew: false, formats: [{ modality: 'presencial', shifts: ['diurno', 'noturno'] }, { modality: 'presencial_integral', shifts: ['integral'] }, { modality: 'presencial_intensivo', shifts: ['agenda'] }] },
  { name: 'Psicopedagogia', slug: 'psicopedagogia', degree: 'Bacharelado', isNew: true, formats: [{ modality: 'semipresencial', shifts: ['agenda'] }] },
  { name: 'Publicidade e Propaganda', slug: 'publicidade-e-propaganda', degree: 'Bacharelado', isNew: false, formats: [{ modality: 'presencial', shifts: ['noturno'] }, { modality: 'semipresencial', shifts: ['agenda'] }, { modality: 'ead', shifts: ['online'] }] },
  { name: 'Redes de Telecomunicações', slug: 'redes-de-telecomunicacoes', degree: 'Tecnólogo', isNew: true, formats: [{ modality: 'semipresencial', shifts: ['agenda'] }] },
  { name: 'Relações Internacionais', slug: 'relacoes-internacionais', degree: 'Bacharelado', isNew: false, formats: [{ modality: 'ead', shifts: ['online'] }] },
  { name: 'Relações Públicas', slug: 'relacoes-publicas', degree: 'Bacharelado', isNew: false, formats: [{ modality: 'ead', shifts: ['online'] }] },
  { name: 'Segurança da Informação', slug: 'seguranca-da-informacao', degree: 'Tecnólogo', isNew: true, formats: [{ modality: 'ead', shifts: ['online'] }] },
  { name: 'Serviço Social', slug: 'servico-social', degree: 'Bacharelado', isNew: false, formats: [{ modality: 'semipresencial', shifts: ['agenda'] }] },
  { name: 'Social Commerce', slug: 'social-commerce', degree: 'Tecnólogo', isNew: true, formats: [{ modality: 'ead_live', shifts: ['online'] }] },
  { name: 'Teologia', slug: 'teologia', degree: 'Bacharelado', isNew: true, formats: [{ modality: 'ead', shifts: ['online'] }] },
  { name: 'Terapia Ocupacional', slug: 'terapia-ocupacional', degree: 'Bacharelado', isNew: false, formats: [{ modality: 'presencial', shifts: ['diurno', 'noturno'] }, { modality: 'semipresencial', shifts: ['agenda'] }] },
]
