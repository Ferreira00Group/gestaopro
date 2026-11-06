// 09-financeiro-relatorios.js - Módulo de Análise Financeira e Curva ABC

export function calcularCurvaABC(produtos) {
    /**
     * Espera uma lista de objetos:
     * [{ id, nome, quantidade, precoUnitario, custoUnitario }]
     */
    if (!produtos || produtos.length === 0) return [];

    // 1. Calcular faturamento e margem total por item
    const itensProcessados = produtos.map(p => {
        const faturamento = (p.quantidade || 0) * (p.precoUnitario || 0);
        const custoTotal = (p.quantidade || 0) * (p.custoUnitario || 0);
        const margem = faturamento - custoTotal;
        return {
            ...p,
            faturamento,
            custoTotal,
            margem
        };
    });

    // 2. Ordenar do maior para o menor faturamento
    itensProcessados.sort((a, b) => b.faturamento - a.faturamento);

    // 3. Calcular faturamento total geral
    const faturamentoGeral = itensProcessados.reduce((acc, item) => acc + item.faturamento, 0);

    // 4. Calcular percentuais individuais, acumulados e classificar A, B, C
    let acumulado = 0;
    return itensProcessados.map(item => {
        const percIndividual = faturamentoGeral > 0 ? (item.faturamento / faturamentoGeral) * 100 : 0;
        acumulado += percIndividual;

        let classe = 'C';
        if (acumulado <= 80) {
            classe = 'A';
        } else if (acumulado <= 95) {
            classe = 'B';
        }

        return {
            ...item,
            percIndividual: Number(percIndividual.toFixed(2)),
            percAcumulado: Number(acumulado.toFixed(2)),
            classe
        };
    });
}

export function gerarResumoFinanceiro(vendas, custosFixos = 0) {
    const faturamentoTotal = vendas.reduce((acc, v) => acc + (v.faturamento || 0), 0);
    const custosVariaveisTotais = vendas.reduce((acc, v) => acc + (v.custoTotal || 0), 0);
    const margemContribucionTotal = faturamentoTotal - custosVariaveisTotais;
    const resultadoLiquido = margemContribucionTotal - custosFixos;
    const lucratividade = faturamentoTotal > 0 ? (resultadoLiquido / faturamentoTotal) * 100 : 0;

    return {
        faturamentoTotal,
        custosVariaveisTotais,
        margemContribucionTotal,
        custosFixos,
        resultadoLiquido,
        lucratividade: Number(lucratividade.toFixed(2))
    };
}
