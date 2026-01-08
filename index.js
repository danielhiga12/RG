// ===============================
// GARANTIR DADOS INICIAIS
// ===============================
economia[message.author.id] ??= { carteira: 0, banco: 0 };

// ===============================
// SET RG
// Exemplo: !setrg Daniel Higa Solteiro 23/07/2006 Masculino
// ===============================
if (cmd === "setrg") {
  if (rgs[message.author.id])
    return message.reply("❌ Você já possui um RG registrado");

  if (args.length < 5)
    return message.reply(
      "❌ Use: !setrg Nome Sobrenome EstadoCivil DD/MM/AAAA Gênero"
    );

  const nome = `${args[0]} ${args[1]}`;
  const estado = args[2];
  const nascimento = args[3];
  const genero = args[4];

  const ano = Number(nascimento.split("/")[2]);
  const idade = new Date().getFullYear() - ano;

  rgs[message.author.id] = {
    nome,
    estado,
    idade,
    genero,
    cpf: gerarCPF(),
    status: "Válido",
  };

  // bônus inicial
  economia[message.author.id].carteira += 1000;

  save("./data/rgs.json", rgs);
  save("./data/economia.json", economia);

  message.reply(
    "🪪 **RG criado com sucesso!**\n💰 R$1000 foram adicionados à sua carteira"
  );
}

// ===============================
// VER PRÓPRIO RG
// ===============================
if (cmd === "rg") {
  const rg = rgs[message.author.id];
  if (!rg) return message.reply("❌ Você não possui RG");

  const emb = new EmbedBuilder()
    .setTitle("🪪 Seu RG")
    .setColor("Blue")
    .setDescription(
      `👤 Nome: ${rg.nome}
🆔 ID: ${message.author.id}
💍 Estado civil: ${rg.estado}
🎂 Idade: ${rg.idade}
📄 CPF: ${rg.cpf}
⚧ Gênero: ${rg.genero}
✅ Status: ${rg.status}`
    );

  message.channel.send({ embeds: [emb] });
}

// ===============================
// CONSULTAR RG (APENAS STAFF)
// ===============================
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

  const alvo =
    message.mentions.users.first() ||
    message.guild.members.cache.get(args[0])?.user;

  if (!alvo || !rgs[alvo.id])
    return message.reply("❌ RG não encontrado");

  const rg = rgs[alvo.id];

  const emb = new EmbedBuilder()
    .setTitle("🪪 RG – Consulta")
    .setColor("DarkBlue")
    .setDescription(
      `👤 Nome: ${rg.nome}
🆔 ID: ${alvo.id}
💍 Estado civil: ${rg.estado}
🎂 Idade: ${rg.idade}
📄 CPF: ${rg.cpf}
⚧ Gênero: ${rg.genero}
✅ Status: ${rg.status}`
    );

  message.channel.send({ embeds: [emb] });
}

// ===============================
// SALDO
// ===============================
if (cmd === "saldo") {
  const e = economia[message.author.id];
  message.reply(`💰 Carteira: R$${e.carteira}\n🏦 Banco: R$${e.banco}`);
}

// ===============================
// TRANSFERIR
// ===============================
if (cmd === "transferir") {
  const alvo = message.mentions.users.first();
  const valor = Number(args[1]);

  if (!alvo || isNaN(valor) || valor <= 0)
    return message.reply("❌ Use: !transferir @usuário valor");

  economia[alvo.id] ??= { carteira: 0, banco: 0 };

  if (economia[message.author.id].carteira < valor)
    return message.reply("❌ Saldo insuficiente");

  economia[message.author.id].carteira -= valor;
  economia[alvo.id].carteira += valor;

  save("./data/economia.json", economia);

  message.reply(`💸 Você transferiu R$${valor} para ${alvo.tag}`);
}

// ===============================
// TOP 10 MAIS RICOS
// ===============================
if (cmd === "top10") {
  const ranking = Object.entries(economia)
    .sort(([, a], [, b]) => b.carteira - a.carteira)
    .slice(0, 10)
    .map(
      ([id, e], i) =>
        `${i + 1}. <@${id}> — 💰 R$${e.carteira}`
    );

  message.reply(
    ranking.length
      ? `🏆 **Top 10 mais ricos:**\n${ranking.join("\n")}`
      : "❌ Nenhum dado encontrado"
  );
}

// ===============================
// ADD MONEY (STAFF)
// ===============================
if (cmd === "addmoney") {
  if (
    !hasCargo(
      message.member,
      CARGOS.FUNDADOR,
      CARGOS.GERENTE,
      CARGOS.MONITOR
    )
  )
    return message.reply("❌ Sem permissão");

  const alvo = message.mentions.users.first();
  const valor = Number(args[1]);

  if (!alvo || isNaN(valor) || valor <= 0)
    return message.reply("❌ Use: !addmoney @usuário valor");

  economia[alvo.id] ??= { carteira: 0, banco: 0 };
  economia[alvo.id].carteira += valor;

  save("./data/economia.json", economia);

  message.reply(`💰 R$${valor} adicionados para ${alvo.tag}`);
}

// ===============================
// REMOVER MONEY (STAFF)
// ===============================
if (cmd === "removermoney") {
  if (
    !hasCargo(
      message.member,
      CARGOS.FUNDADOR,
      CARGOS.GERENTE,
      CARGOS.MONITOR
    )
  )
    return message.reply("❌ Sem permissão");

  const alvo = message.mentions.users.first();
  const valor = Number(args[1]);

  if (!alvo || isNaN(valor) || valor <= 0)
    return message.reply("❌ Use: !removermoney @usuário valor");

  economia[alvo.id] ??= { carteira: 0, banco: 0 };

  if (economia[alvo.id].carteira < valor)
    return message.reply("❌ Saldo insuficiente do usuário");

  economia[alvo.id].carteira -= valor;

  save("./data/economia.json", economia);

  message.reply(`💸 R$${valor} removidos de ${alvo.tag}`);
}
