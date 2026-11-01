# Plataforma Web Premium — Fernanda Caetano (Enfermeira Dermatológica e Esteta)

Aplicação web full-stack desenvolvida sob medida para **Fernanda Caetano — Enfermeira Dermatológica e Esteta, especialista em Feridas, Laserterapia e Estética Avançada**.

---

## 1. Visão Geral dos Módulos Implementados

1. **Página Pública Exclusiva (`/`)**:
   - Design sofisticado com a paleta oficial (`#07152B` Azul-marinho profundo, `#D97732` Laranja sofisticado, `#F7F5F1` Off-white, `#C5A46D` Dourado discreto e `#64748B` Cinza auxiliar).
   - Tipografia combinando `Cormorant Garamond` (títulos) e `Inter` (interface e leitura).
   - Cabeçalho com foto/monograma profissional, selo de especialidades, botão de compartilhamento e botões 100% dinâmicos persistidos no banco de dados.
2. **Catálogo de Procedimentos (`/procedimentos` e `/procedimentos/[slug]`)**:
   - Exibição organizada por categorias dinâmicas, duração estimada, modalidade (`Presencial` ou `Home Care`), unidades disponíveis e orientações de preparo.
3. **Sistema de Agendamento Online em Etapas (`/agendar` e `/agendamento/sucesso`)**:
   - Fluxo guiado: Procedimento → Unidade → Data (calendário mensal calculado no servidor) → Turno disponível (Manhã/Tarde/Noite) → Horário livre → Identificação com aceite de Privacidade (LGPD) → Revisão e Confirmação com código único (`FC-XXXXXX`).
4. **Motor de Disponibilidade e Prevenção de Conflitos**:
   - Calculado integralmente no servidor (`src/lib/availability.ts`) e gravado com transação atômica (`BEGIN IMMEDIATE` em `src/lib/booking-service.ts`).
   - Considera agenda compartilhada da profissional entre unidades (se houver agendamento no Ed. Platinum, o mesmo horário mais margem de deslocamento fica indisponível no Farol de São Thomé), duração do procedimento, intervalo pós-atendimento (`buffer_after_minutes`), expediente por dia da semana, feriados e bloqueios manuais.
5. **Central Administrativa (`/admin`)**:
   - **Dashboard (`/admin`)**: Indicadores em tempo real, solicitações aguardando aprovação e status do Bot de WhatsApp.
   - **Agenda de Atendimentos (`/admin/agenda`)**: Calendário inteligente com visualizações **Dia / Semana / Mês** e painel lateral diário (incluindo os dados de demonstração em **12 de novembro de 2026** com Mariana Silva, Ana Costa e Juliana Martins), filtros, confirmação em 1 clique, reagendamento e bloqueio de dia/horário.
   - **Editor da Página Pública (`/admin/site`)**: Criação, edição, ocultação, exclusão e reordenação (drag-and-drop ou setas) dos botões da página inicial, edição de perfil/bio/cores, modo **Salvar Rascunho**, **Pré-visualização** (`/?preview=1`) e **Publicar Alterações** com simulador de smartphone ao vivo.
   - **WhatsApp Bot & QR Code (`/admin/whatsapp`)**: Inspirado no bot da barbearia em Baileys, com geração de QR Code na tela para a Dra. Fernanda conectar seu aparelho, templates editáveis com variáveis dinâmicas para **Cliente** e **Profissional**, disparo automático e histórico de mensagens enviadas.

---

## 2. Como Executar Localmente

### Pré-requisitos
- Node.js 22.5+ ou 24+ (utiliza o motor transacional nativo `node:sqlite` com WAL ativado, sem exigir compiladores C++ externos no Windows).

### Comandos
```bash
# 1. Instalar dependências
npm install

# 2. Executar testes automatizados de disponibilidade e concorrência
npm test

# 3. Iniciar servidor de desenvolvimento (http://localhost:3000)
npm run dev

# 4. Gerar build de produção
npm run build
npm run start
```

---

## 3. Credenciais Iniciais de Desenvolvimento (`/admin/login`)

- **URL:** `http://localhost:3000/admin/login`
- **E-mail:** `admin@fernandacaetano.com.br`
- **Senha:** `Fernanda@2026`

> **Importante para Produção:** Altere a senha em `/admin/configuracoes` e configure as variáveis `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `SESSION_SECRET` no servidor antes da publicação oficial. Todos os endereços, telefones de WhatsApp e horários iniciais estão identificados como dados configuráveis para revisão da Dra. Fernanda Caetano.

