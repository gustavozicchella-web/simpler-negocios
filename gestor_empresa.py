"""
=============================================================================
GESTOR EMPRESA - Sistema de Gestão para Pequenas Empresas
=============================================================================
Dependências: pip install streamlit pandas
Executar: streamlit run gestor_empresa.py
=============================================================================
"""

import streamlit as st
import sqlite3
import pandas as pd
from datetime import datetime, date
import re
import os
import io

# =====================================================================
# CONFIGURAÇÃO DO BANCO DE DADOS SQLITE
# =====================================================================

DB_PATH = "gestor_empresa.db"

def get_connection():
    """Retorna uma conexão com o banco SQLite."""
    conn = sqlite3.connect(DB_PATH, detect_types=sqlite3.PARSE_DECLTYPES)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Cria todas as tabelas necessárias caso não existam."""
    conn = get_connection()
    c = conn.cursor()

    # Tabela de funcionários
    c.execute("""
        CREATE TABLE IF NOT EXISTS funcionarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            cpf TEXT NOT NULL UNIQUE,
            cargo TEXT NOT NULL,
            salario_bruto REAL NOT NULL,
            data_admissao TEXT NOT NULL,
            telefone TEXT,
            observacoes TEXT,
            ativo INTEGER DEFAULT 1
        )
    """)

    # Tabela de clientes
    c.execute("""
        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            cnpj_cpf TEXT NOT NULL UNIQUE,
            endereco TEXT,
            telefone TEXT,
            email TEXT,
            ativo INTEGER DEFAULT 1
        )
    """)

    # Tabela de recebíveis (valores a receber)
    c.execute("""
        CREATE TABLE IF NOT EXISTS recebiveis (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER NOT NULL,
            descricao TEXT NOT NULL,
            valor REAL NOT NULL,
            data_emissao TEXT NOT NULL,
            data_vencimento TEXT NOT NULL,
            status TEXT DEFAULT 'Pendente',
            FOREIGN KEY (cliente_id) REFERENCES clientes(id)
        )
    """)

    # Tabela de vales (adiantamentos)
    c.execute("""
        CREATE TABLE IF NOT EXISTS vales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            funcionario_id INTEGER NOT NULL,
            data TEXT NOT NULL,
            valor REAL NOT NULL,
            motivo TEXT,
            descontado INTEGER DEFAULT 0,
            FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id)
        )
    """)

    # Tabela de pagamentos (folha de pagamento)
    c.execute("""
        CREATE TABLE IF NOT EXISTS pagamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            funcionario_id INTEGER NOT NULL,
            mes INTEGER NOT NULL,
            ano INTEGER NOT NULL,
            salario_bruto REAL NOT NULL,
            total_vales REAL NOT NULL,
            salario_liquido REAL NOT NULL,
            data_pagamento TEXT NOT NULL,
            FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id)
        )
    """)

    conn.commit()
    conn.close()

# =====================================================================
# FUNÇÕES AUXILIARES
# =====================================================================

def formatar_cpf(cpf: str) -> str:
    """Aplica máscara de CPF: 000.000.000-00"""
    cpf = re.sub(r'\D', '', cpf)
    if len(cpf) == 11:
        return f"{cpf[:3]}.{cpf[3:6]}.{cpf[6:9]}-{cpf[9:]}"
    return cpf

def formatar_cnpj(cnpj: str) -> str:
    """Aplica máscara de CNPJ: 00.000.000/0000-00"""
    cnpj = re.sub(r'\D', '', cnpj)
    if len(cnpj) == 14:
        return f"{cnpj[:2]}.{cnpj[2:5]}.{cnpj[5:8]}/{cnpj[8:12]}-{cnpj[12:]}"
    return cnpj

def formatar_cpf_cnpj(valor: str) -> str:
    """Formata CPF ou CNPJ dependendo do tamanho."""
    digitos = re.sub(r'\D', '', valor)
    if len(digitos) == 11:
        return formatar_cpf(valor)
    elif len(digitos) == 14:
        return formatar_cnpj(valor)
    return valor

def validar_cpf_cnpj(valor: str) -> bool:
    """Valida se é um CPF (11 dígitos) ou CNPJ (14 dígitos)."""
    digitos = re.sub(r'\D', '', valor)
    return len(digitos) in (11, 14)

def formatar_moeda(valor: float) -> str:
    """Formata valor como moeda brasileira."""
    return f"R$ {valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

def df_para_csv(df: pd.DataFrame) -> bytes:
    """Converte DataFrame para CSV em bytes (para download)."""
    return df.to_csv(index=False, sep=";", encoding="utf-8-sig").encode("utf-8-sig")

# =====================================================================
# MÓDULO: DASHBOARD
# =====================================================================

def pagina_dashboard():
    """Exibe o dashboard principal com cards resumo."""
    st.title("📊 Dashboard")
    st.markdown("---")
    conn = get_connection()

    # Total a receber (recebíveis pendentes)
    total_receber = conn.execute(
        "SELECT COALESCE(SUM(valor), 0) FROM recebiveis WHERE status = 'Pendente'"
    ).fetchone()[0]

    # Total de funcionários ativos
    total_funcionarios = conn.execute(
        "SELECT COUNT(*) FROM funcionarios WHERE ativo = 1"
    ).fetchone()[0]

    # Total de vales pendentes (não descontados)
    total_vales = conn.execute(
        "SELECT COALESCE(SUM(valor), 0) FROM vales WHERE descontado = 0"
    ).fetchone()[0]

    # Total folha bruta (soma dos salários dos funcionários ativos)
    total_folha = conn.execute(
        "SELECT COALESCE(SUM(salario_bruto), 0) FROM funcionarios WHERE ativo = 1"
    ).fetchone()[0]

    # Salário líquido estimado (bruto - vales pendentes)
    total_liquido = total_folha - total_vales

    conn.close()

    # Cards
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("💰 Total a Receber", formatar_moeda(total_receber))
    with col2:
        st.metric("💸 Folha Líquida Estimada", formatar_moeda(max(total_liquido, 0)))
    with col3:
        st.metric("👥 Funcionários Ativos", total_funcionarios)
    with col4:
        st.metric("📋 Vales Pendentes", formatar_moeda(total_vales))

    st.markdown("---")

    # Recebíveis próximos do vencimento
    st.subheader("⚠️ Recebíveis próximos do vencimento")
    conn = get_connection()
    df = pd.read_sql_query("""
        SELECT r.id, c.nome AS cliente, r.descricao, r.valor,
               r.data_vencimento, r.status
        FROM recebiveis r
        JOIN clientes c ON r.cliente_id = c.id
        WHERE r.status = 'Pendente'
        ORDER BY r.data_vencimento ASC
        LIMIT 10
    """, conn)
    conn.close()

    if df.empty:
        st.info("Nenhum recebível pendente.")
    else:
        df["valor"] = df["valor"].apply(formatar_moeda)
        st.dataframe(df, use_container_width=True, hide_index=True)

# =====================================================================
# MÓDULO: FUNCIONÁRIOS
# =====================================================================

def pagina_funcionarios():
    """Gerencia cadastro, edição e exclusão de funcionários."""
    st.title("👥 Funcionários")
    st.markdown("---")
    conn = get_connection()

    tab_lista, tab_cadastro = st.tabs(["📋 Lista", "➕ Cadastrar"])

    # --- ABA LISTA ---
    with tab_lista:
        funcionarios = pd.read_sql_query("""
            SELECT f.id, f.nome, f.cpf, f.cargo, f.salario_bruto,
                   f.data_admissao, f.telefone, f.observacoes,
                   COALESCE(SUM(CASE WHEN v.descontado = 0 THEN v.valor ELSE 0 END), 0) AS vales_pendentes
            FROM funcionarios f
            LEFT JOIN vales v ON v.funcionario_id = f.id
            WHERE f.ativo = 1
            GROUP BY f.id
            ORDER BY f.nome
        """, conn)

        if funcionarios.empty:
            st.info("Nenhum funcionário cadastrado.")
        else:
            # Formatação
            display_df = funcionarios.copy()
            display_df["salario_bruto"] = display_df["salario_bruto"].apply(formatar_moeda)
            display_df["vales_pendentes"] = display_df["vales_pendentes"].apply(formatar_moeda)
            display_df["cpf"] = display_df["cpf"].apply(formatar_cpf)
            st.dataframe(
                display_df[["id", "nome", "cpf", "cargo", "salario_bruto", "vales_pendentes", "telefone"]],
                use_container_width=True, hide_index=True
            )

            # Download CSV
            csv = df_para_csv(display_df)
            st.download_button("📥 Exportar CSV", csv, "funcionarios.csv", "text/csv")

            st.markdown("---")

            # Edição e exclusão
            st.subheader("✏️ Editar / Excluir Funcionário")
            func_ids = funcionarios["id"].tolist()
            func_nomes = funcionarios["nome"].tolist()
            opcoes = [f"{fid} - {fn}" for fid, fn in zip(func_ids, func_nomes)]
            selecionado = st.selectbox("Selecione o funcionário", opcoes, key="edit_func")

            if selecionado:
                func_id = int(selecionado.split(" - ")[0])
                row = funcionarios[funcionarios["id"] == func_id].iloc[0]

                with st.form("form_editar_func"):
                    nome = st.text_input("Nome", value=row["nome"])
                    cpf = st.text_input("CPF", value=row["cpf"])
                    cargo = st.text_input("Cargo", value=row["cargo"])
                    salario = st.number_input("Salário Bruto", value=float(row["salario_bruto"]), min_value=0.0, step=100.0)
                    data_adm = st.date_input("Data de Admissão", value=datetime.strptime(row["data_admissao"], "%Y-%m-%d").date())
                    telefone = st.text_input("Telefone", value=row["telefone"] or "")
                    obs = st.text_area("Observações", value=row["observacoes"] or "")

                    col1, col2 = st.columns(2)
                    with col1:
                        salvar = st.form_submit_button("💾 Salvar Alterações")
                    with col2:
                        excluir = st.form_submit_button("🗑️ Excluir Funcionário")

                    if salvar:
                        if not nome or not cpf or not cargo:
                            st.error("Preencha nome, CPF e cargo.")
                        elif salario < 0:
                            st.error("Salário não pode ser negativo.")
                        else:
                            conn.execute("""
                                UPDATE funcionarios SET nome=?, cpf=?, cargo=?, salario_bruto=?,
                                data_admissao=?, telefone=?, observacoes=? WHERE id=?
                            """, (nome, re.sub(r'\D', '', cpf), cargo, salario,
                                  data_adm.strftime("%Y-%m-%d"), telefone, obs, func_id))
                            conn.commit()
                            st.success("✅ Funcionário atualizado!")
                            st.rerun()

                    if excluir:
                        conn.execute("UPDATE funcionarios SET ativo = 0 WHERE id = ?", (func_id,))
                        conn.commit()
                        st.success("✅ Funcionário desativado.")
                        st.rerun()

    # --- ABA CADASTRAR ---
    with tab_cadastro:
        with st.form("form_novo_func"):
            nome = st.text_input("Nome Completo")
            cpf = st.text_input("CPF (somente números)")
            cargo = st.text_input("Cargo")
            salario = st.number_input("Salário Bruto Mensal (R$)", min_value=0.0, step=100.0)
            data_adm = st.date_input("Data de Admissão", value=date.today())
            telefone = st.text_input("Telefone")
            obs = st.text_area("Observações")
            enviar = st.form_submit_button("💾 Cadastrar")

            if enviar:
                cpf_limpo = re.sub(r'\D', '', cpf)
                if not nome or not cpf_limpo or not cargo:
                    st.error("Preencha nome, CPF e cargo.")
                elif len(cpf_limpo) != 11:
                    st.error("CPF inválido. Deve conter 11 dígitos.")
                elif salario < 0:
                    st.error("Salário não pode ser negativo.")
                else:
                    try:
                        conn.execute("""
                            INSERT INTO funcionarios (nome, cpf, cargo, salario_bruto, data_admissao, telefone, observacoes)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        """, (nome, cpf_limpo, cargo, salario, data_adm.strftime("%Y-%m-%d"), telefone, obs))
                        conn.commit()
                        st.success(f"✅ Funcionário '{nome}' cadastrado com sucesso!")
                        st.rerun()
                    except sqlite3.IntegrityError:
                        st.error("⚠️ CPF já cadastrado.")

    conn.close()

# =====================================================================
# MÓDULO: CLIENTES
# =====================================================================

def pagina_clientes():
    """Gerencia cadastro, edição e exclusão de clientes."""
    st.title("🏢 Clientes")
    st.markdown("---")
    conn = get_connection()

    tab_lista, tab_cadastro = st.tabs(["📋 Lista", "➕ Cadastrar"])

    with tab_lista:
        clientes = pd.read_sql_query(
            "SELECT * FROM clientes WHERE ativo = 1 ORDER BY nome", conn
        )
        if clientes.empty:
            st.info("Nenhum cliente cadastrado.")
        else:
            display_df = clientes.copy()
            display_df["cnpj_cpf"] = display_df["cnpj_cpf"].apply(formatar_cpf_cnpj)
            st.dataframe(
                display_df[["id", "nome", "cnpj_cpf", "endereco", "telefone", "email"]],
                use_container_width=True, hide_index=True
            )
            csv = df_para_csv(display_df)
            st.download_button("📥 Exportar CSV", csv, "clientes.csv", "text/csv")

            st.markdown("---")
            st.subheader("✏️ Editar / Excluir Cliente")
            opcoes = [f"{r['id']} - {r['nome']}" for _, r in clientes.iterrows()]
            selecionado = st.selectbox("Selecione o cliente", opcoes, key="edit_cli")

            if selecionado:
                cli_id = int(selecionado.split(" - ")[0])
                row = clientes[clientes["id"] == cli_id].iloc[0]

                with st.form("form_editar_cli"):
                    nome = st.text_input("Nome / Razão Social", value=row["nome"])
                    cnpj_cpf = st.text_input("CNPJ/CPF", value=row["cnpj_cpf"])
                    endereco = st.text_input("Endereço", value=row["endereco"] or "")
                    telefone = st.text_input("Telefone", value=row["telefone"] or "")
                    email = st.text_input("E-mail", value=row["email"] or "")

                    col1, col2 = st.columns(2)
                    with col1:
                        salvar = st.form_submit_button("💾 Salvar")
                    with col2:
                        excluir = st.form_submit_button("🗑️ Excluir")

                    if salvar:
                        doc = re.sub(r'\D', '', cnpj_cpf)
                        if not nome or not doc:
                            st.error("Preencha nome e CNPJ/CPF.")
                        elif not validar_cpf_cnpj(cnpj_cpf):
                            st.error("CNPJ/CPF inválido.")
                        else:
                            conn.execute("""
                                UPDATE clientes SET nome=?, cnpj_cpf=?, endereco=?, telefone=?, email=?
                                WHERE id=?
                            """, (nome, doc, endereco, telefone, email, cli_id))
                            conn.commit()
                            st.success("✅ Cliente atualizado!")
                            st.rerun()

                    if excluir:
                        conn.execute("UPDATE clientes SET ativo = 0 WHERE id = ?", (cli_id,))
                        conn.commit()
                        st.success("✅ Cliente desativado.")
                        st.rerun()

    with tab_cadastro:
        with st.form("form_novo_cli"):
            nome = st.text_input("Nome / Razão Social")
            cnpj_cpf = st.text_input("CNPJ/CPF (somente números)")
            endereco = st.text_input("Endereço")
            telefone = st.text_input("Telefone")
            email = st.text_input("E-mail")
            enviar = st.form_submit_button("💾 Cadastrar")

            if enviar:
                doc = re.sub(r'\D', '', cnpj_cpf)
                if not nome or not doc:
                    st.error("Preencha nome e CNPJ/CPF.")
                elif not validar_cpf_cnpj(cnpj_cpf):
                    st.error("CNPJ/CPF inválido (11 ou 14 dígitos).")
                else:
                    try:
                        conn.execute("""
                            INSERT INTO clientes (nome, cnpj_cpf, endereco, telefone, email)
                            VALUES (?, ?, ?, ?, ?)
                        """, (nome, doc, endereco, telefone, email))
                        conn.commit()
                        st.success(f"✅ Cliente '{nome}' cadastrado!")
                        st.rerun()
                    except sqlite3.IntegrityError:
                        st.error("⚠️ CNPJ/CPF já cadastrado.")

    conn.close()

# =====================================================================
# MÓDULO: RECEBÍVEIS
# =====================================================================

def pagina_recebiveis():
    """Gerencia valores a receber (serviços prestados)."""
    st.title("💰 Recebíveis")
    st.markdown("---")
    conn = get_connection()

    tab_lista, tab_cadastro = st.tabs(["📋 Lista", "➕ Registrar Serviço"])

    with tab_lista:
        # Filtro por status
        filtro = st.selectbox("Filtrar por status", ["Todos", "Pendente", "Pago"], key="filtro_rec")
        where = ""
        if filtro != "Todos":
            where = f"AND r.status = '{filtro}'"

        recebiveis = pd.read_sql_query(f"""
            SELECT r.id, c.nome AS cliente, r.descricao, r.valor,
                   r.data_emissao, r.data_vencimento, r.status
            FROM recebiveis r
            JOIN clientes c ON r.cliente_id = c.id
            WHERE 1=1 {where}
            ORDER BY r.data_vencimento DESC
        """, conn)

        if recebiveis.empty:
            st.info("Nenhum recebível encontrado.")
        else:
            display_df = recebiveis.copy()
            display_df["valor"] = display_df["valor"].apply(formatar_moeda)
            st.dataframe(display_df, use_container_width=True, hide_index=True)

            csv = df_para_csv(display_df)
            st.download_button("📥 Exportar CSV", csv, "recebiveis.csv", "text/csv")

            # Marcar como pago
            pendentes = recebiveis[recebiveis["status"] == "Pendente"]
            if not pendentes.empty:
                st.markdown("---")
                st.subheader("✅ Marcar como Pago")
                opcoes = [f"{r['id']} - {r['cliente']} - {formatar_moeda(r['valor'])}" for _, r in pendentes.iterrows()]
                sel = st.selectbox("Selecione o recebível", opcoes, key="pagar_rec")
                if st.button("💵 Confirmar Pagamento", key="btn_pagar_rec"):
                    rec_id = int(sel.split(" - ")[0])
                    conn.execute("UPDATE recebiveis SET status = 'Pago' WHERE id = ?", (rec_id,))
                    conn.commit()
                    st.success("✅ Recebível marcado como pago!")
                    st.rerun()

    with tab_cadastro:
        clientes = pd.read_sql_query("SELECT id, nome FROM clientes WHERE ativo = 1 ORDER BY nome", conn)
        if clientes.empty:
            st.warning("Cadastre um cliente antes de registrar recebíveis.")
        else:
            with st.form("form_novo_rec"):
                cliente_opcoes = [f"{r['id']} - {r['nome']}" for _, r in clientes.iterrows()]
                cliente_sel = st.selectbox("Cliente", cliente_opcoes)
                descricao = st.text_input("Descrição do Serviço")
                valor = st.number_input("Valor Total (R$)", min_value=0.01, step=100.0)
                data_emissao = st.date_input("Data de Emissão", value=date.today())
                data_vencimento = st.date_input("Data de Vencimento", value=date.today())
                enviar = st.form_submit_button("💾 Registrar")

                if enviar:
                    if not descricao:
                        st.error("Preencha a descrição.")
                    elif valor <= 0:
                        st.error("Valor deve ser positivo.")
                    else:
                        cli_id = int(cliente_sel.split(" - ")[0])
                        conn.execute("""
                            INSERT INTO recebiveis (cliente_id, descricao, valor, data_emissao, data_vencimento, status)
                            VALUES (?, ?, ?, ?, ?, 'Pendente')
                        """, (cli_id, descricao, valor,
                              data_emissao.strftime("%Y-%m-%d"),
                              data_vencimento.strftime("%Y-%m-%d")))
                        conn.commit()
                        st.success("✅ Recebível registrado!")
                        st.rerun()

    conn.close()

# =====================================================================
# MÓDULO: VALES (ADIANTAMENTOS)
# =====================================================================

def pagina_vales():
    """Gerencia vales (adiantamentos) para funcionários."""
    st.title("📋 Vales / Adiantamentos")
    st.markdown("---")
    conn = get_connection()

    tab_lista, tab_emitir = st.tabs(["📋 Histórico", "➕ Emitir Vale"])

    with tab_lista:
        # Filtro por funcionário
        funcionarios = pd.read_sql_query(
            "SELECT id, nome FROM funcionarios WHERE ativo = 1 ORDER BY nome", conn
        )
        opcoes_filtro = ["Todos"] + [f"{r['id']} - {r['nome']}" for _, r in funcionarios.iterrows()]
        filtro = st.selectbox("Filtrar por funcionário", opcoes_filtro, key="filtro_vale")

        where = ""
        if filtro != "Todos":
            fid = int(filtro.split(" - ")[0])
            where = f"AND v.funcionario_id = {fid}"

        vales = pd.read_sql_query(f"""
            SELECT v.id, f.nome AS funcionario, v.data, v.valor, v.motivo,
                   CASE WHEN v.descontado = 1 THEN 'Descontado' ELSE 'Pendente' END AS situacao
            FROM vales v
            JOIN funcionarios f ON v.funcionario_id = f.id
            WHERE 1=1 {where}
            ORDER BY v.data DESC
        """, conn)

        if vales.empty:
            st.info("Nenhum vale encontrado.")
        else:
            display_df = vales.copy()
            display_df["valor"] = display_df["valor"].apply(formatar_moeda)
            st.dataframe(display_df, use_container_width=True, hide_index=True)

            csv = df_para_csv(display_df)
            st.download_button("📥 Exportar CSV", csv, "vales.csv", "text/csv")

        # Resumo de vales pendentes por funcionário
        st.markdown("---")
        st.subheader("📊 Saldo de Vales Pendentes por Funcionário")
        resumo = pd.read_sql_query("""
            SELECT f.nome, COALESCE(SUM(v.valor), 0) AS total_pendente
            FROM funcionarios f
            LEFT JOIN vales v ON v.funcionario_id = f.id AND v.descontado = 0
            WHERE f.ativo = 1
            GROUP BY f.id
            ORDER BY total_pendente DESC
        """, conn)
        if not resumo.empty:
            resumo["total_pendente"] = resumo["total_pendente"].apply(formatar_moeda)
            st.dataframe(resumo, use_container_width=True, hide_index=True)

    with tab_emitir:
        funcionarios = pd.read_sql_query(
            "SELECT id, nome FROM funcionarios WHERE ativo = 1 ORDER BY nome", conn
        )
        if funcionarios.empty:
            st.warning("Cadastre funcionários antes de emitir vales.")
        else:
            with st.form("form_novo_vale"):
                func_opcoes = [f"{r['id']} - {r['nome']}" for _, r in funcionarios.iterrows()]
                func_sel = st.selectbox("Funcionário", func_opcoes)
                data_vale = st.date_input("Data", value=date.today())
                valor = st.number_input("Valor (R$)", min_value=0.01, step=50.0)
                motivo = st.text_input("Motivo (opcional)")
                enviar = st.form_submit_button("💾 Emitir Vale")

                if enviar:
                    if valor <= 0:
                        st.error("Valor deve ser positivo.")
                    else:
                        fid = int(func_sel.split(" - ")[0])
                        conn.execute("""
                            INSERT INTO vales (funcionario_id, data, valor, motivo)
                            VALUES (?, ?, ?, ?)
                        """, (fid, data_vale.strftime("%Y-%m-%d"), valor, motivo or None))
                        conn.commit()
                        st.success("✅ Vale emitido!")
                        st.rerun()

    conn.close()

# =====================================================================
# MÓDULO: FOLHA DE PAGAMENTO
# =====================================================================

def pagina_folha():
    """Calcula e processa a folha de pagamento mensal."""
    st.title("💼 Folha de Pagamento")
    st.markdown("---")
    conn = get_connection()

    col1, col2 = st.columns(2)
    with col1:
        mes = st.selectbox("Mês", list(range(1, 13)),
                           index=date.today().month - 1,
                           format_func=lambda m: [
                               "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                               "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
                           ][m - 1])
    with col2:
        ano = st.number_input("Ano", min_value=2020, max_value=2030, value=date.today().year)

    st.markdown("---")

    # Verificar se já existe pagamento para este mês
    pagamentos_existentes = pd.read_sql_query("""
        SELECT p.id, f.nome, p.salario_bruto, p.total_vales, p.salario_liquido, p.data_pagamento
        FROM pagamentos p
        JOIN funcionarios f ON p.funcionario_id = f.id
        WHERE p.mes = ? AND p.ano = ?
        ORDER BY f.nome
    """, conn, params=(mes, ano))

    if not pagamentos_existentes.empty:
        st.success(f"✅ Folha de {mes:02d}/{ano} já processada!")
        display_df = pagamentos_existentes.copy()
        display_df["salario_bruto"] = display_df["salario_bruto"].apply(formatar_moeda)
        display_df["total_vales"] = display_df["total_vales"].apply(formatar_moeda)
        display_df["salario_liquido"] = display_df["salario_liquido"].apply(formatar_moeda)
        st.dataframe(display_df[["nome", "salario_bruto", "total_vales", "salario_liquido", "data_pagamento"]],
                     use_container_width=True, hide_index=True)
        csv = df_para_csv(display_df)
        st.download_button("📥 Exportar CSV", csv, f"folha_{mes:02d}_{ano}.csv", "text/csv")
        return

    # Calcular folha
    st.subheader("📝 Prévia da Folha")

    funcionarios = pd.read_sql_query(
        "SELECT id, nome, salario_bruto FROM funcionarios WHERE ativo = 1 ORDER BY nome", conn
    )

    if funcionarios.empty:
        st.info("Nenhum funcionário ativo.")
        conn.close()
        return

    dados_folha = []
    for _, func in funcionarios.iterrows():
        # Soma todos os vales pendentes (não descontados) até o final do mês selecionado
        ultimo_dia = f"{ano}-{mes:02d}-31"
        total_vales = conn.execute("""
            SELECT COALESCE(SUM(valor), 0) FROM vales
            WHERE funcionario_id = ? AND descontado = 0 AND data <= ?
        """, (func["id"], ultimo_dia)).fetchone()[0]

        liquido = func["salario_bruto"] - total_vales
        dados_folha.append({
            "id": func["id"],
            "nome": func["nome"],
            "salario_bruto": func["salario_bruto"],
            "total_vales": total_vales,
            "salario_liquido": max(liquido, 0)
        })

    df_folha = pd.DataFrame(dados_folha)

    # Exibir prévia
    display_df = df_folha.copy()
    display_df["salario_bruto"] = display_df["salario_bruto"].apply(formatar_moeda)
    display_df["total_vales"] = display_df["total_vales"].apply(formatar_moeda)
    display_df["salario_liquido"] = display_df["salario_liquido"].apply(formatar_moeda)
    st.dataframe(display_df[["nome", "salario_bruto", "total_vales", "salario_liquido"]],
                 use_container_width=True, hide_index=True)

    # Totais
    st.markdown("---")
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Total Bruto", formatar_moeda(df_folha["salario_bruto"].sum()))
    with col2:
        st.metric("Total Vales", formatar_moeda(df_folha["total_vales"].sum()))
    with col3:
        st.metric("Total Líquido", formatar_moeda(df_folha["salario_liquido"].sum()))

    # Processar pagamento
    st.markdown("---")
    if st.button("✅ Processar Pagamento da Folha", type="primary"):
        hoje = date.today().strftime("%Y-%m-%d")
        for _, row in df_folha.iterrows():
            # Registrar pagamento
            conn.execute("""
                INSERT INTO pagamentos (funcionario_id, mes, ano, salario_bruto, total_vales, salario_liquido, data_pagamento)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (row["id"], mes, ano, row["salario_bruto"], row["total_vales"], row["salario_liquido"], hoje))

            # Marcar vales como descontados
            ultimo_dia = f"{ano}-{mes:02d}-31"
            conn.execute("""
                UPDATE vales SET descontado = 1
                WHERE funcionario_id = ? AND descontado = 0 AND data <= ?
            """, (row["id"], ultimo_dia))

        conn.commit()
        st.success(f"✅ Folha de {mes:02d}/{ano} processada com sucesso!")
        st.rerun()

    conn.close()

# =====================================================================
# MÓDULO: RELATÓRIOS
# =====================================================================

def pagina_relatorios():
    """Gera relatórios gerais exportáveis em CSV."""
    st.title("📈 Relatórios")
    st.markdown("---")
    conn = get_connection()

    tipo = st.selectbox("Selecione o relatório", [
        "Funcionários Ativos",
        "Clientes Ativos",
        "Recebíveis Pendentes",
        "Recebíveis Pagos",
        "Vales Pendentes",
        "Histórico de Pagamentos"
    ])

    if tipo == "Funcionários Ativos":
        df = pd.read_sql_query("""
            SELECT f.nome, f.cpf, f.cargo, f.salario_bruto, f.data_admissao, f.telefone,
                   COALESCE(SUM(CASE WHEN v.descontado = 0 THEN v.valor ELSE 0 END), 0) AS vales_pendentes
            FROM funcionarios f
            LEFT JOIN vales v ON v.funcionario_id = f.id
            WHERE f.ativo = 1
            GROUP BY f.id ORDER BY f.nome
        """, conn)
        if not df.empty:
            df["cpf"] = df["cpf"].apply(formatar_cpf)
            df["salario_bruto"] = df["salario_bruto"].apply(formatar_moeda)
            df["vales_pendentes"] = df["vales_pendentes"].apply(formatar_moeda)

    elif tipo == "Clientes Ativos":
        df = pd.read_sql_query("SELECT nome, cnpj_cpf, endereco, telefone, email FROM clientes WHERE ativo = 1 ORDER BY nome", conn)
        if not df.empty:
            df["cnpj_cpf"] = df["cnpj_cpf"].apply(formatar_cpf_cnpj)

    elif tipo == "Recebíveis Pendentes":
        df = pd.read_sql_query("""
            SELECT c.nome AS cliente, r.descricao, r.valor, r.data_emissao, r.data_vencimento
            FROM recebiveis r JOIN clientes c ON r.cliente_id = c.id
            WHERE r.status = 'Pendente' ORDER BY r.data_vencimento
        """, conn)
        if not df.empty:
            df["valor"] = df["valor"].apply(formatar_moeda)

    elif tipo == "Recebíveis Pagos":
        df = pd.read_sql_query("""
            SELECT c.nome AS cliente, r.descricao, r.valor, r.data_emissao, r.data_vencimento
            FROM recebiveis r JOIN clientes c ON r.cliente_id = c.id
            WHERE r.status = 'Pago' ORDER BY r.data_vencimento DESC
        """, conn)
        if not df.empty:
            df["valor"] = df["valor"].apply(formatar_moeda)

    elif tipo == "Vales Pendentes":
        df = pd.read_sql_query("""
            SELECT f.nome AS funcionario, v.data, v.valor, v.motivo
            FROM vales v JOIN funcionarios f ON v.funcionario_id = f.id
            WHERE v.descontado = 0 ORDER BY f.nome, v.data
        """, conn)
        if not df.empty:
            df["valor"] = df["valor"].apply(formatar_moeda)

    elif tipo == "Histórico de Pagamentos":
        df = pd.read_sql_query("""
            SELECT f.nome, p.mes, p.ano, p.salario_bruto, p.total_vales,
                   p.salario_liquido, p.data_pagamento
            FROM pagamentos p JOIN funcionarios f ON p.funcionario_id = f.id
            ORDER BY p.ano DESC, p.mes DESC, f.nome
        """, conn)
        if not df.empty:
            df["salario_bruto"] = df["salario_bruto"].apply(formatar_moeda)
            df["total_vales"] = df["total_vales"].apply(formatar_moeda)
            df["salario_liquido"] = df["salario_liquido"].apply(formatar_moeda)

    conn.close()

    if df.empty:
        st.info("Nenhum dado encontrado para este relatório.")
    else:
        st.dataframe(df, use_container_width=True, hide_index=True)
        csv = df_para_csv(df)
        st.download_button("📥 Exportar CSV", csv, f"relatorio_{tipo.lower().replace(' ', '_')}.csv", "text/csv")

# =====================================================================
# APLICAÇÃO PRINCIPAL
# =====================================================================

def main():
    """Função principal: configura a página e a navegação por sidebar."""
    st.set_page_config(
        page_title="Gestor Empresa",
        page_icon="🏢",
        layout="wide"
    )

    # Inicializar banco de dados
    init_db()

    # Sidebar - Navegação
    st.sidebar.title("🏢 Gestor Empresa")
    st.sidebar.markdown("---")

    pagina = st.sidebar.radio(
        "Navegação",
        [
            "📊 Dashboard",
            "👥 Funcionários",
            "🏢 Clientes",
            "💰 Recebíveis",
            "📋 Vales",
            "💼 Folha de Pagamento",
            "📈 Relatórios"
        ]
    )

    st.sidebar.markdown("---")
    st.sidebar.caption("Gestor Empresa v1.0")
    st.sidebar.caption("© 2026 - Todos os direitos reservados")

    # Roteamento
    if pagina == "📊 Dashboard":
        pagina_dashboard()
    elif pagina == "👥 Funcionários":
        pagina_funcionarios()
    elif pagina == "🏢 Clientes":
        pagina_clientes()
    elif pagina == "💰 Recebíveis":
        pagina_recebiveis()
    elif pagina == "📋 Vales":
        pagina_vales()
    elif pagina == "💼 Folha de Pagamento":
        pagina_folha()
    elif pagina == "📈 Relatórios":
        pagina_relatorios()


if __name__ == "__main__":
    main()
