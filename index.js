// ===== RG =====
if (cmd === "setrg") {
  const [nome, estado, nascimento, genero] = args;

  if (!nome || !estado || !nascimento || !genero)
    return message.reply("❌ Use: !setrg Nome EstadoCivil DD/MM/AAAA Gênero");

  const ano = nascimento.split("/")[2];
  if (!ano) return message.reply("❌ Data inválida");

  const idade = new Date().getFullYear() - Number(ano);

  rgs[message.author.id] = {
    nome,
    estado,
    idade,
    genero,
    cpf: gerarCPF(),
    status: "Válido",
  };

  economia[message.author.id] ??= { carteira: 0, banco: 0 };
  economia[message.author.id].carteira += 1000;

  save("./data/rgs.json", rgs);
  save("./data/economia.json", economia);

  message.reply("🪪 RG criado com sucesso e 💰 R$1000 adicionados à carteira!");
}

if (cmd === "rg") {
  const rg = rgs[message.author.id];
  if (!rg) return message.reply("❌ Você não possui RG");

  const embed = new EmbedBuilder()
    .setTitle("🪪 Seu RG")
    .setColor("Green")
    .setDescription(
      `👤 Nome: ${rg.nome}
💍 Estado Civil: ${rg.estado}
🎂 Idade: ${rg.idade}
📄 CPF: ${rg.cpf}
⚧ Gênero: ${rg.genero}
✅ Status: ${rg.status}`
    );

  message.channel.send({ embeds: [embed] });
}

if (cmd === "consultar") {
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
    return message.reply("❌ Sem permissão");

  const alvo = user || message.author;
  const rg = rgs[alvo.id];
  if (!rg) return message.reply("❌ RG não encontrado");

  const embed = new EmbedBuilder()
    .setTitle("🪪 Consulta de RG")
    .setColor("Blue")
    .setDescription(
      `👤 Nome: ${rg.nome}
🆔 ID: ${alvo.id}
🎂 Idade: ${rg.idade}
📄 CPF: ${rg.cpf}
⚧ Gênero: ${rg.genero}
✅ Status: ${rg.status}`
    );

  message.channel.send({ embeds: [embed] });
}

// ===== ECONOMIA =====
if (cmd === "saldo") {
  economia[message.author.id] ??= { carteira: 0, banco: 0 };

  message.reply(
    `💰 Carteira: R$${economia[message.author.id].carteira}\n🏦 Banco: R$${economia[message.author.id].banco}`
  );
}

if (cmd === "addmoney") {
  if (!hasCargo(message.member, CARGOS.FUNDADOR, CARGOS.GERENTE, CARGOS.MONITOR))
    return message.reply("❌ Sem permissão");

  const valor = Number(args[1]);
  if (!user || isNaN(valor)) return message.reply("❌ Use: !addmoney @usuário valor");

  economia[user.id] ??= { carteira: 0, banco: 0 };
  economia[user.id].carteira += valor;
  save("./data/economia.json", economia);

  const embed = new EmbedBuilder()
    .setTitle("💰 Dinheiro Adicionado")
    .setColor("Green")
    .setDescription(
      `👮 Staff: ${message.author.tag}
👤 Usuário: ${user.tag}
💵 Valor: R$${valor}`
    )
    .setTimestamp();

  const canal = message.guild.channels.cache.find(c => c.name === "logs-economia");
  if (canal) canal.send({ embeds: [embed] });

  message.reply("✅ Dinheiro adicionado");
}

if (cmd === "removermoney") {
  if (!hasCargo(message.member, CARGOS.FUNDADOR, CARGOS.GERENTE, CARGOS.MONITOR))
    return message.reply("❌ Sem permissão");

  const valor = Number(args[1]);
  if (!user || isNaN(valor))
    return message.reply("❌ Use: !removermoney @usuário valor");

  economia[user.id] ??= { carteira: 0, banco: 0 };
  economia[user.id].carteira -= valor;
  save("./data/economia.json", economia);

  const embed = new EmbedBuilder()
    .setTitle("💸 Dinheiro Removido")
    .setColor("Red")
    .setDescription(
      `👮 Staff: ${message.author.tag}
👤 Usuário: ${user.tag}
💵 Valor: R$${valor}`
    )
    .setTimestamp();

  const canal = message.guild.channels.cache.find(c => c.name === "logs-economia");
  if (canal) canal.send({ embeds: [embed] });

  message.reply("✅ Dinheiro removido");
}

if (cmd === "transferir") {
  const alvo = user;
  const valor = Number(args[1]);

  if (!alvo || isNaN(valor) || valor <= 0)
    return message.reply("❌ Use: !transferir @usuário valor");

  economia[message.author.id] ??= { carteira: 0, banco: 0 };
  economia[alvo.id] ??= { carteira: 0, banco: 0 };

  if (economia[message.author.id].carteira < valor)
    return message.reply("❌ Saldo insuficiente");

  economia[message.author.id].carteira -= valor;
  economia[alvo.id].carteira += valor;
  save("./data/economia.json", economia);

  const embed = new EmbedBuilder()
    .setTitle("💸 Transferência")
    .setColor("Blue")
    .setDescription(
      `👤 Remetente: ${message.author.tag}
🎯 Destinatário: ${alvo.tag}
💰 Valor: R$${valor}`
    )
    .setTimestamp();

  const canal = message.guild.channels.cache.find(c => c.name === "logs-economia");
  if (canal) canal.send({ embeds: [embed] });

  message.reply(`💸 Transferência de R$${valor} realizada`);
}
