// ===== RG + CNH =====
if (cmd === "setrg") {
  const t = args.join(" ").split(";");
  if (t.length < 4)
    return message.reply("Use: !setrg Nome;Estado Civil;DD/MM/AAAA;Gênero");

  const idade = new Date().getFullYear() - t[2].split("/")[2];

  rgs[message.author.id] = {
    nome: t[0],
    estado: t[1],
    idade,
    genero: t[3],
    cpf: gerarCPF(),
    status: "Válido",
    validade: "23/07/2026",
    cnh: "Sem CNH",
  };

  economia[message.author.id].carteira += 1000; // depósito inicial
  save("./data/rgs.json", rgs);
  save("./data/economia.json", economia);
  message.reply("🪪 RG criado e R$1000 depositados na carteira!");
}

// ===== CONSULTAR =====
if (cmd === "consultar") {
  if (
    !hasCargo(
      message.member,
      CARGOS.FUNDADOR,
      CARGOS.GERENTE,
      CARGOS.MONITOR,
      CARGOS.ADMIN,
      CARGOS.MOD,
      CARGOS.POLICIA,
      CARGOS.JUIZ
    )
  )
    return message.reply("❌ Sem permissão");

  let alvo = user ? rgs[user.id] : null;

  if (!alvo) {
    // Tenta por RG (ID)
    const rgID = args[0];
    if (rgs[rgID]) alvo = rgs[rgID];
    else {
      // Tenta por CPF
      alvo = Object.values(rgs).find((r) => r.cpf === args[0]);
      if (!alvo) return message.reply("❌ RG não encontrado");
    }
  }

  const emb = new EmbedBuilder()
    .setTitle("🪪 Carteira de Identidade")
    .setColor("Blue")
    .setDescription(
      `👤 Nome: ${alvo.nome}\n🆔 RG: ${user?.id || args[0]}\n💍 Estado Civil: ${alvo.estado}\n🎂 Idade: ${alvo.idade}\n📄 CPF: ${alvo.cpf}\n⚧ Gênero: ${alvo.genero}\n🚔 CNH: ${alvo.cnh}\n📋 Antecedentes: ${antecedentes[user?.id]?.length || "Nenhum"}\n✅ Status: ${alvo.status}`
    );
  message.channel.send({ embeds: [emb] });
}

// ===== CNH =====
if (cmd === "tirarcnh") {
  if (!rgs[message.author.id])
    return message.reply("❌ Você precisa ter RG primeiro");

  const categoria = args[0]?.toUpperCase();
  if (!["B", "C"].includes(categoria))
    return message.reply("Use: !tirarcnh B ou C");

  const custo = categoria === "B" ? 5000 : 7000;
  if (economia[message.author.id].carteira < custo)
    return message.reply(`❌ Você precisa de R$${custo} para tirar a CNH`);

  economia[message.author.id].carteira -= custo;
  save("./data/economia.json", economia);

  // Simula prova de 6 perguntas
  const perguntas = [
    { q: "Qual a velocidade máxima na cidade?", r: "50" },
    { q: "Sinal vermelho significa?", r: "parar" },
    { q: "Uso do cinto é?", r: "obrigatorio" },
    { q: "Prioridade na rotatória?", r: "quem esta dentro" },
    { q: "Farol aceso durante chuva?", r: "sim" },
    { q: "Álcool e direção?", r: "não" },
  ];

  let acertos = 0;
  for (const p of perguntas) {
    // Simulação: resposta automática para teste (substituir por input real se tiver sistema de respostas)
    const resposta = p.r; // em implementação real, coletar resposta do usuário
    if (resposta.toLowerCase() === p.r.toLowerCase()) acertos++;
  }

  const minimo = 4; // mínimo de acertos
  if (acertos >= minimo) {
    rgs[message.author.id].cnh = categoria;
    rgs[message.author.id].cnhValidade = "23/07/2027"; // CNH válida por 1 ano
    save("./data/rgs.json", rgs);
    message.reply(`✅ Parabéns! CNH categoria ${categoria} liberada`);
  } else {
    message.reply(
      `❌ Você reprovou na prova. Precisa refazer e pagar R$${custo} novamente`
    );
  }
}

// ===== RENOVAÇÃO CNH =====
if (cmd === "renovarcnh") {
  if (!rgs[message.author.id] || rgs[message.author.id].cnh === "Sem CNH")
    return message.reply("❌ Você não possui CNH para renovar");

  const custo = 2000;
  if (economia[message.author.id].carteira < custo)
    return message.reply(`❌ Você precisa de R$${custo} para renovar a CNH`);

  economia[message.author.id].carteira -= custo;
  rgs[message.author.id].cnhValidade = "23/07/2027";
  save("./data/economia.json", economia);
  save("./data/rgs.json", rgs);
  message.reply(`✅ CNH renovada com sucesso! Vencimento atualizado`);
}

// ===== SET CNH (Staff) =====
if (cmd === "setcnh") {
  if (
    !hasCargo(
      message.member,
      CARGOS.FUNDADOR,
      CARGOS.GERENTE,
      CARGOS.MONITOR,
      CARGOS.ADMIN,
      CARGOS.MOD
    )
  )
    return message.reply("❌ Apenas staff pode setar CNH");

  const categoria = args[1]?.toUpperCase();
  if (!["B", "C", "Sem CNH"].includes(categoria))
    return message.reply("Use: !setcnh @usuário B/C ou Sem CNH");

  rgs[user.id].cnh = categoria;
  save("./data/rgs.json", rgs);
  message.reply(`✅ CNH de ${user.tag} atualizada para ${categoria}`);
}
// ===== ECONOMIA AVANÇADA =====

// Saldo do usuário
if (cmd === "saldo") {
  message.reply(
    `💰 Carteira: ${economia[message.author.id].carteira}\n🏦 Banco: ${economia[message.author.id].banco}`
  );
}

// Transferência entre usuários
if (cmd === "transferir") {
  const valor = Number(args[1]);
  if (isNaN(valor) || valor <= 0)
    return message.reply("❌ Valor inválido");

  if (economia[message.author.id].carteira < valor)
    return message.reply("❌ Saldo insuficiente");

  economia[message.author.id].carteira -= valor;
  economia[user.id].carteira += valor;
  save("./data/economia.json", economia);
  message.reply(`💸 Transferido R$${valor} para ${user.tag}`);
}

// Top 10 mais ricos
if (cmd === "top10") {
  const sorted = Object.entries(economia)
    .sort(([, a], [, b]) => b.carteira - a.carteira)
    .slice(0, 10)
    .map(([id, e], i) => `${i + 1}. <@${id}> - R$${e.carteira}`);
  message.reply(`🏆 Top 10 mais ricos:\n${sorted.join("\n")}`);
}

// ===== EMPREGOS =====

// Lista de empregos e salários
const listaEmpregos = {
  POLICIA: { cargo: CARGOS.POLICIA, salario: 800 },
  BOMBEIRO: { cargo: CARGOS.BOMBEIRO, salario: 700 },
  PARAMEDICO: { cargo: CARGOS.PARAMEDICO, salario: 750 },
  MEDICO: { cargo: CARGOS.MEDICO, salario: 900 },
  CAMINHONEIRO: { cargo: null, salario: 780 },
  TRANSPORTE: { cargo: null, salario: 750 },
  TAXISTA: { cargo: null, salario: 650 },
  CONSTRUCAO: { cargo: null, salario: 700 },
  CORREIOS: { cargo: null, salario: 680 },
  FAZENDEIRO: { cargo: null, salario: 720 },
  POSTO: { cargo: null, salario: 650 },
  LIXEIRO: { cargo: null, salario: 600 },
};

// Selecionar emprego
if (cmd === "emprego") {
  const escolha = args[0]?.toUpperCase();
  if (!listaEmpregos[escolha])
    return message.reply("❌ Emprego inválido");

  const emp = listaEmpregos[escolha];

  // Checa se precisa de cargo
  if (emp.cargo && !hasCargo(message.member, emp.cargo))
    return message.reply(`❌ Você precisa do cargo ${emp.cargo} para este emprego`);

  // Impede que o usuário tenha dois empregos ao mesmo tempo
  if (empregos[message.author.id])
    return message.reply("❌ Você já possui um emprego. Use !trocaremprego para mudar.");

  empregos[message.author.id] = { nome: escolha, salario: emp.salario, ultimaPagamento: Date.now() };
  save("./data/empregos.json", empregos);
  economia[message.author.id].carteira += emp.salario; // recebe salário ao iniciar
  save("./data/economia.json", economia);

  message.reply(`💼 Você iniciou o emprego de ${escolha} e recebeu R$${emp.salario}`);
}

// Trocar de emprego
if (cmd === "trocaremprego") {
  const escolha = args[0]?.toUpperCase();
  if (!listaEmpregos[escolha])
    return message.reply("❌ Emprego inválido");

  const emp = listaEmpregos[escolha];

  if (emp.cargo && !hasCargo(message.member, emp.cargo))
    return message.reply(`❌ Você precisa do cargo ${emp.cargo} para este emprego`);

  empregos[message.author.id] = { nome: escolha, salario: emp.salario, ultimaPagamento: Date.now() };
  save("./data/empregos.json", empregos);
  economia[message.author.id].carteira += emp.salario; // recebe salário ao trocar
  save("./data/economia.json", economia);

  message.reply(`💼 Você mudou para o emprego de ${escolha} e recebeu R$${emp.salario}`);
}

// Remover do emprego (apenas staff)
if (cmd === "sairemprego") {
  if (!hasCargo(message.member, CARGOS.FUNDADOR, CARGOS.GERENTE, CARGOS.MONITOR))
    return message.reply("❌ Apenas staff pode remover do emprego");

  delete empregos[user.id];
  save("./data/empregos.json", empregos);
  message.reply(`✅ ${user.tag} foi removido do emprego`);
}

// Pagamento diário automático (executar ao iniciar o bot ou a cada comando relevante)
for (const [id, emp] of Object.entries(empregos)) {
  const agora = Date.now();
  if (agora - emp.ultimaPagamento >= 24 * 60 * 60 * 1000) {
    economia[id].carteira += emp.salario;
    emp.ultimaPagamento = agora;
    save("./data/empregos.json", empregos);
    save("./data/economia.json", economia);
  }
}
// ===== POLÍCIA =====

// Adicionar mandado
if (cmd === "addmandado") {
  if (!hasCargo(message.member, CARGOS.POLICIA)) return message.reply("❌ Apenas policiais podem emitir mandados");
  mandados[user.id] = { motivo: args.slice(0).join(" "), ativo: true };
  save("./data/mandados.json", mandados);
  log(message.guild, "logs-policia", "🚔 Mandado emitido", user.tag, "Red");
  message.reply(`🚨 Mandado emitido para ${user.tag}`);
}

// Remover mandado
if (cmd === "removermandado") {
  if (!hasCargo(message.member, CARGOS.POLICIA)) return message.reply("❌ Apenas policiais podem remover mandados");
  delete mandados[user.id];
  save("./data/mandados.json", mandados);
  message.reply(`✅ Mandado removido de ${user.tag}`);
}

// Listar mandados ativos
if (cmd === "mandadosativos") {
  if (!hasCargo(message.member, CARGOS.POLICIA)) return message.reply("❌ Apenas policiais podem ver os mandados");
  const ativos = Object.entries(mandados)
    .filter(([_, m]) => m.ativo)
    .map(([id, m]) => `<@${id}> - ${m.motivo}`);
  message.reply(ativos.length ? `🚨 Mandados ativos:\n${ativos.join("\n")}` : "Nenhum mandado ativo");
}

// Multar usuário
if (cmd === "multar") {
  if (!hasCargo(message.member, CARGOS.POLICIA)) return message.reply("❌ Apenas policiais podem multar");
  const valor = Number(args[1]);
  if (isNaN(valor) || valor <= 0) return message.reply("❌ Valor inválido");

  multas[user.id] ??= [];
  multas[user.id].push({ valor, motivo: args.slice(2).join(" "), data: Date.now(), pago: false });
  economia[user.id].carteira -= valor;
  governo.caixa += valor * IMPOSTO_MULTA;

  save("./data/multas.json", multas);
  save("./data/economia.json", economia);
  save("./data/governo.json", governo);

  log(message.guild, "logs-economia", "💸 Multa aplicada", `Valor: ${valor}\nImposto: ${valor * IMPOSTO_MULTA}`, "Red");
  message.reply(`🚔 Multa de R$${valor} aplicada para ${user.tag}`);
}

// Ver multas (somente staff)
if (cmd === "vermultar") {
  if (!hasCargo(message.member, CARGOS.FUNDADOR, CARGOS.GERENTE, CARGOS.MONITOR, CARGOS.POLICIA))
    return message.reply("❌ Sem permissão");
  const lista = multas[user.id];
  if (!lista?.length) return message.reply("Nenhuma multa registrada");
  const texto = lista.map((m, i) => `${i + 1}. Valor: R$${m.valor} | Motivo: ${m.motivo} | Pago: ${m.pago ? "Sim" : "Não"}`).join("\n");
  message.reply(`📋 Multas de ${user.tag}:\n${texto}`);
}

// Retirar multa (somente staff)
if (cmd === "retirarmulta") {
  if (!hasCargo(message.member, CARGOS.FUNDADOR, CARGOS.GERENTE, CARGOS.MONITOR, CARGOS.POLICIA))
    return message.reply("❌ Sem permissão");
  delete multas[user.id];
  save("./data/multas.json", multas);
  message.reply(`✅ Todas as multas de ${user.tag} foram removidas`);
}

// Pagar multa
if (cmd === "pagarmulta") {
  const lista = multas[message.author.id];
  if (!lista?.length) return message.reply("❌ Você não possui multas");
  const multa = lista[0]; // paga a primeira da lista
  if (economia[message.author.id].carteira < multa.valor)
    return message.reply("❌ Saldo insuficiente");
  economia[message.author.id].carteira -= multa.valor;
  multa.pago = true;
  save("./data/multas.json", multas);
  save("./data/economia.json", economia);
  message.reply(`💸 Multa de R$${multa.valor} paga com sucesso!`);
}

// Registrar placa de veículo
if (cmd === "registrarplaca") {
  if (!hasCargo(message.member, CARGOS.POLICIA)) return message.reply("❌ Apenas policiais podem registrar placas");
  veiculos[args[0]] = { dono: user.id, status: "Regular" };
  save("./data/veiculos.json", veiculos);
  message.reply(`🚗 Veículo com placa ${args[0]} registrado para ${user.tag}`);
}

// Consultar placa
if (cmd === "placa") {
  const placa = args[0];
  const v = veiculos[placa];
  if (!v) return message.reply("❌ Veículo não encontrado");
  message.reply(`🚗 Placa: ${placa}\nDono: <@${v.dono}>\nStatus: ${v.status}`);
}

// ===== JUDICIÁRIO =====

// Abrir processo
if (cmd === "abrirprocesso") {
  if (!hasCargo(message.member, CARGOS.JUIZ)) return message.reply("❌ Apenas juízes podem abrir processos");
  processos[user.id] = { juiz: message.author.tag, status: "Aberto" };
  save("./data/processos.json", processos);
  log(message.guild, "logs-judiciario", "⚖️ Processo aberto", user.tag);
  message.reply(`⚖️ Processo aberto para ${user.tag}`);
}

// Encerrar processo
if (cmd === "encerrarprocesso") {
  if (!hasCargo(message.member, CARGOS.JUIZ)) return message.reply("❌ Apenas juízes podem encerrar processos");
  if (!processos[user.id]) return message.reply("❌ Processo não encontrado");
  processos[user.id].status = "Encerrado";
  save("./data/processos.json", processos);
  message.reply(`⚖️ Processo de ${user.tag} encerrado`);
}

// Cassar CNH
if (cmd === "cassarcnh") {
  if (!hasCargo(message.member, CARGOS.JUIZ)) return message.reply("❌ Apenas juízes podem cassar CNH");
  if (!rgs[user.id]) return message.reply("❌ Usuário não possui RG");
  rgs[user.id].cnh = "Cassada";
  save("./data/rgs.json", rgs);
  message.reply(`🚫 CNH de ${user.tag} cassada`);
}

// Regularizar CNH
if (cmd === "regularcnh") {
  if (!hasCargo(message.member, CARGOS.JUIZ)) return message.reply("❌ Apenas juízes podem regularizar CNH");
  if (!rgs[user.id]) return message.reply("❌ Usuário não possui RG");
  rgs[user.id].cnh = "Regular";
  save("./data/rgs.json", rgs);
  message.reply(`✅ CNH de ${user.tag} regularizada`);
}

// Invalidar RG
if (cmd === "invalidarrg") {
  if (!hasCargo(message.member, CARGOS.JUIZ)) return message.reply("❌ Apenas juízes podem invalidar RG");
  if (!rgs[user.id]) return message.reply("❌ Usuário não possui RG");
  rgs[user.id].status = "Inválido";
  save("./data/rgs.json", rgs);
  message.reply(`❌ RG de ${user.tag} invalidado`);
}

// Regularizar RG
if (cmd === "regularizarrg") {
  if (!hasCargo(message.member, CARGOS.JUIZ)) return message.reply("❌ Apenas juízes podem regularizar RG");
  if (!rgs[user.id]) return message.reply("❌ Usuário não possui RG");
  rgs[user.id].status = "Válido";
  save("./data/rgs.json", rgs);
  message.reply(`✅ RG de ${user.tag} regularizado`);
}
// ===== CASSINO =====
if (cmd === "cassino") {
  const aposta = Number(args[0]);
  if (isNaN(aposta) || aposta <= 0) return message.reply("❌ Valor inválido para apostar");
  if (economia[message.author.id].carteira < aposta) return message.reply("❌ Saldo insuficiente");

  economia[message.author.id].carteira -= aposta;

  // Gerar resultado do cassino (3 números de 1 a 6)
  const resultados = [1, 2, 3].map(() => Math.floor(Math.random() * 6) + 1);
  let premio = 0;
  if (new Set(resultados).size === 1) {
    premio = aposta * 5; // triple match
  } else if (new Set(resultados).size === 2) {
    premio = aposta * 2; // double match
  }

  economia[message.author.id].carteira += premio;
  save("./data/economia.json", economia);

  const embed = new EmbedBuilder()
    .setTitle("🎰 Cassino")
    .setColor(premio > 0 ? "Green" : "Red")
    .setDescription(`🎲 Resultado: ${resultados.join(" | ")}\n💰 Você ${premio > 0 ? `ganhou R$${premio}` : "perdeu"}`)
    .setTimestamp();

  message.channel.send({ embeds: [embed] });
}

// ===== AJUDA =====
if (cmd === "ajuda") {
  const embed = new EmbedBuilder()
    .setTitle("📜 Lista de Comandos")
    .setColor("Blue")
    .setDescription(`
🪪 **RG**
!setrg Nome;Estado Civil;DD/MM/AAAA;Gênero - Criar RG
!consultar @usuário | RG | CPF - Consultar RG de alguém (staff e polícia)

💰 **Economia**
!saldo - Ver saldo
!transferir @usuário valor - Transferir dinheiro
!top10 - Ver os 10 mais ricos
!addmoney @usuário valor - Adicionar dinheiro (staff)
!removermoney @usuário valor - Remover dinheiro (staff)

🚔 **Polícia**
!addmandado @usuário motivo - Criar mandado
!removermandado @usuário - Remover mandado
!mandadosativos - Listar mandados ativos
!multar @usuário valor motivo - Aplicar multa
!vermultar @usuário - Ver multas (staff)
!retirarmulta @usuário - Remover multas (staff)
!pagarmulta - Pagar multa
!registrarplaca PLACA @usuário - Registrar veículo
!placa PLACA - Consultar veículo

⚖️ **Judiciário**
!abrirprocesso @usuário - Abrir processo
!encerrarprocesso @usuário - Encerrar processo
!cassarcnh @usuário - Cassar CNH
!regularcnh @usuário - Regularizar CNH
!invalidarrg @usuário - Invalidar RG
!regularizarrg @usuário - Regularizar RG

🪪 **CNH**
!tirarcnh B|C - Realizar prova de CNH pagando 5000(B)/7000(C)
!renovarcnh - Renovar CNH pagando 2000
!setcnh @usuário B|C - Setar CNH (staff)

🚗 **Empregos**
!emprego NOME - Selecionar emprego
!trocaremprego NOME - Trocar de emprego
!sairemprego @usuário - Remover do emprego (staff)

🎰 **Cassino**
!cassino valor - Apostar no cassino
  `)
    .setTimestamp();

  message.channel.send({ embeds: [embed] });
}
