// index.js - Bot Roleplay Completo
const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder } = require("discord.js");
const fs = require("fs");

// ------------------------ Configuração do Bot ------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const PREFIX = "!";
const RG_FILE = "./rgs.json";
const ECON_FILE = "./economia.json";
const LOG_CHANNEL = "logs-rg";

// ------------------------ Cargos Autorizados ------------------------
const CARGOS_RG_EDITAR = ["Fundador", "Gerente de Comunidade", "Monitor", "Administrador"];
const CARGOS_RG_CONSULTAR = ["Fundador", "Gerente de Comunidade", "Monitor", "Administrador", "Moderador"];
const CARGOS_POLICIA = ["Policial", "Capitão", "Delegado"];
const CARGOS_JUDICIARIO = ["Juiz", "Promotor", "Advogado"];

// ------------------------ Funções utilitárias ------------------------
function gerarNumero19() {
  let num = "";
  for (let i = 0; i < 19; i++) num += Math.floor(Math.random() * 10);
  return num;
}

function gerarCPF() {
  let cpf = gerarNumero19();
  return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{10})$/, "$1.$2.$3.$4");
}

function carregarJSON(file) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, "{}");
  const content = fs.readFileSync(file, "utf8");
  try {
    return JSON.parse(content || "{}");
  } catch {
    return {};
  }
}

function salvarJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function calcularIdade(dataNascimento) {
  const [dia, mes, ano] = dataNascimento.split("/").map(Number);
  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  if (hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia)) {
    idade--;
  }
  return idade;
}

function enviarLog(guild, mensagem) {
  const canal = guild.channels.cache.find(c => c.name === LOG_CHANNEL && c.isTextBased());
  if (canal) canal.send(mensagem);
}

// ------------------------ Inicialização de arquivos ------------------------
let rgs = carregarJSON(RG_FILE);
let economia = carregarJSON(ECON_FILE);

// ------------------------ Evento mensagens ------------------------
client.on("messageCreate", async message => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).split(" ");
  const comando = args.shift().toLowerCase();

  // ------------------------ !setrg ------------------------
  if (comando === "setrg") {
    if (rgs[message.author.id]) return message.reply("❌ Você já possui um RG registrado.");
    if (args.length < 4) return message.reply("❌ Uso correto: `!setrg Nome Completo EstadoCivil DD/MM/AAAA Gênero`");

    const nome = args.slice(0, -3).join(" ");
    const estadoCivil = args[args.length - 3];
    const nascimento = args[args.length - 2];
    const genero = args[args.length - 1];

    const idade = calcularIdade(nascimento);
    if (idade < 0 || idade > 120) return message.reply("❌ Data de nascimento inválida.");

    rgs[message.author.id] = {
      rg: gerarNumero19(),
      nome,
      estadoCivil,
      nascimento,
      genero,
      idade,
      cpf: gerarCPF(),
      cnh: { numero: gerarNumero19(), validade: "23/07/2030", cassada: false, motivo: "", dataCassacao: "" },
      ct: { numero: gerarNumero19(), validade: "23/07/2030" },
      processos: [],
      preso: false,
      procurado: false,
      multas: []
    };

    salvarJSON(RG_FILE, rgs);
    message.reply("✅ RG criado com sucesso! Use `!rg` para visualizar.");
    enviarLog(message.guild, `🪪 ${message.author.tag} criou RG`);
  }

  // ------------------------ !rg ------------------------
  if (comando === "rg") {
    const rg = rgs[message.author.id];
    if (!rg) return message.reply("❌ Você não possui RG.");

    const embed = new EmbedBuilder()
      .setColor("#1f2c34")
      .setTitle("🪪 CARTEIRA DE IDENTIDADE")
      .setDescription(`━━━━━━━━━━━━━━━━━━━━\n🆔 **RG Nº:** ${rg.rg}\n━━━━━━━━━━━━━━━━━━━━`)
      .addFields(
        { name: "👤 Nome", value: rg.nome, inline: true },
        { name: "📄 CPF", value: rg.cpf, inline: true },
        { name: "💍 Estado Civil", value: rg.estadoCivil, inline: true },
        { name: "🎂 Nascimento", value: rg.nascimento, inline: true },
        { name: "⚧ Gênero", value: rg.genero, inline: true },
        { name: "🔢 Idade", value: `${rg.idade} anos`, inline: true },
        { name: "🚗 CNH", value: rg.cnh.cassada ? `❌ Cassada` : `✅ Válida`, inline: true },
        { name: "💼 CT", value: `✅ Válida`, inline: true }
      )
      .setFooter({ text: "Documento válido apenas para roleplay" })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  }

  // ------------------------ !rgeditar ------------------------
  if (comando === "rgeditar") {
    const possuiCargo = message.member.roles.cache.some(r => CARGOS_RG_EDITAR.includes(r.name));
    if (!possuiCargo) return message.reply("❌ Você não tem permissão para usar este comando.");

    const user = message.mentions.users.first();
    if (!user) return message.reply("❌ Mencione o usuário.");
    const novoNome = args.slice(1).join(" ");
    if (!rgs[user.id]) return message.reply("❌ Este usuário não possui RG.");
    if (!novoNome) return message.reply("❌ Informe o novo nome.");

    rgs[user.id].nome = novoNome;
    salvarJSON(RG_FILE, rgs);
    message.reply(`✅ RG de ${user.tag} atualizado para: ${novoNome}`);
    enviarLog(message.guild, `✏️ RG de ${user.tag} editado para: ${novoNome} por ${message.author.tag}`);
  }

  // ------------------------ !rgdeletar ------------------------
  if (comando === "rgdeletar") {
    const possuiCargo = message.member.roles.cache.some(r => CARGOS_RG_EDITAR.includes(r.name));
    if (!possuiCargo) return message.reply("❌ Você não tem permissão para usar este comando.");

    const user = message.mentions.users.first();
    if (!user) return message.reply("❌ Mencione o usuário.");
    if (!rgs[user.id]) return message.reply("❌ Este usuário não possui RG.");

    delete rgs[user.id];
    salvarJSON(RG_FILE, rgs);
    message.reply(`🗑️ RG de ${user.tag} deletado com sucesso.`);
    enviarLog(message.guild, `🗑️ RG de ${user.tag} deletado por ${message.author.tag}`);
  }

  // ------------------------ !consultar ------------------------
  if (comando === "consultar") {
    const possuiCargo = message.member.roles.cache.some(r => CARGOS_RG_CONSULTAR.includes(r.name));
    if (!possuiCargo) return message.reply("❌ Você não tem permissão para usar este comando.");

    const user = message.mentions.users.first();
    if (!user) return message.reply("❌ Mencione o usuário.");
    if (!rgs[user.id]) return message.reply("❌ Este usuário não possui RG.");

    const rg = rgs[user.id];
    const embed = new EmbedBuilder()
      .setColor("#1f2c34")
      .setTitle(`🪪 RG de ${user.tag}`)
      .setDescription(`━━━━━━━━━━━━━━━━━━━━\n🆔 **RG Nº:** ${rg.rg}\n━━━━━━━━━━━━━━━━━━━━`)
      .addFields(
        { name: "👤 Nome", value: rg.nome, inline: true },
        { name: "📄 CPF", value: rg.cpf, inline: true },
        { name: "💍 Estado Civil", value: rg.estadoCivil, inline: true },
        { name: "🎂 Nascimento", value: rg.nascimento, inline: true },
        { name: "⚧ Gênero", value: rg.genero, inline: true },
        { name: "🔢 Idade", value: `${rg.idade} anos`, inline: true },
        { name: "🚗 CNH", value: rg.cnh.cassada ? `❌ Cassada` : `✅ Válida`, inline: true },
        { name: "💼 CT", value: `✅ Válida`, inline: true }
      )
      .setFooter({ text: "Consulta feita por staff" })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  }

  // ------------------------ !cassarcnh ------------------------
  if (comando === "cassarcnh") {
    const possuiCargo = message.member.roles.cache.some(r => [...CARGOS_POLICIA, ...CARGOS_JUDICIARIO].includes(r.name));
    if (!possuiCargo) return message.reply("❌ Você não tem permissão para usar este comando.");

    const user = message.mentions.users.first();
    if (!user) return message.reply("❌ Mencione o usuário.");
    if (!rgs[user.id] || !rgs[user.id].cnh) return message.reply("❌ Este usuário não possui CNH.");
    const motivo = args.slice(1).join(" ");
    if (!motivo) return message.reply("❌ Informe o motivo da cassação.");

    rgs[user.id].cnh.cassada = true;
    rgs[user.id].cnh.motivo = motivo;
    rgs[user.id].cnh.dataCassacao = new Date().toLocaleDateString();
    salvarJSON(RG_FILE, rgs);

    message.reply(`🚫 CNH de ${user.tag} cassada por: ${motivo}`);
    enviarLog(message.guild, `🚫 CNH de ${user.tag} cassada por ${message.author.tag}. Motivo: ${motivo}`);
  }

  // ------------------------ !habilitarcnh ------------------------
  if (comando === "habilitarcnh") {
    const possuiCargo = message.member.roles.cache.some(r => [...CARGOS_POLICIA, ...CARGOS_JUDICIARIO].includes(r.name));
    if (!possuiCargo) return message.reply("❌ Você não tem permissão para usar este comando.");

    const user = message.mentions.users.first();
    if (!user) return message.reply("❌ Mencione o usuário.");
    if (!rgs[user.id] || !rgs[user.id].cnh) return message.reply("❌ Este usuário não possui CNH.");

    rgs[user.id].cnh.cassada = false;
    rgs[user.id].cnh.motivo = "";
    rgs[user.id].cnh.dataCassacao = "";
    salvarJSON(RG_FILE, rgs);

    message.reply(`✅ CNH de ${user.tag} reativada.`);
    enviarLog(message.guild, `✅ CNH de ${user.tag} reativada por ${message.author.tag}`);
  }

  // ------------------------ Comandos de economia ------------------------
  if (!economia[message.author.id]) economia[message.author.id] = { wallet: 0, bank: 0 };

  if (comando === "saldo") {
    const eco = economia[message.author.id];
    message.reply(`💰 Carteira: R$${eco.wallet}\n🏦 Banco: R$${eco.bank}`);
  }

  if (comando === "depositar") {
    const valor = parseInt(args[0]);
    if (isNaN(valor) || valor <= 0) return message.reply("❌ Valor inválido.");
    if (economia[message.author.id].wallet < valor) return message.reply("❌ Você não tem esse valor na carteira.");
    economia[message.author.id].wallet -= valor;
    economia[message.author.id].bank += valor;
    salvarJSON(ECON_FILE, economia);
    message.reply(`✅ Deposito realizado! Banco: R$${economia[message.author.id].bank}`);
  }

  if (comando === "sacar") {
    const valor = parseInt(args[0]);
    if (isNaN(valor) || valor <= 0) return message.reply("❌ Valor inválido.");
    if (economia[message.author.id].bank < valor) return message.reply("❌ Você não tem esse valor no banco.");
    economia[message.author.id].bank -= valor;
    economia[message.author.id].wallet += valor;
    salvarJSON(ECON_FILE, economia);
    message.reply(`✅ Saque realizado! Carteira: R$${economia[message.author.id].wallet}`);
  }

  if (comando === "trabalhar") {
    if (!rgs[message.author.id] || !rgs[message.author.id].ct) return message.reply("❌ Você precisa de Carteira de Trabalho válida.");
    const ganho = Math.floor(Math.random() * 500) + 100;
    economia[message.author.id].wallet += ganho;
    salvarJSON(ECON_FILE, economia);
    message.reply(`💼 Você trabalhou e ganhou R$${ganho}`);
  }

  // ------------------------ Aqui você pode continuar adicionando !comprar, !prender, !liberar, !multar, !revistar, !julgar, !recurso, !casar, !divorciar, !ficar etc ------------------------
});

// ------------------------ Slash command /ajuda ------------------------
const commands = [
  new SlashCommandBuilder()
    .setName("ajuda")
    .setDescription("Mostra todos os comandos do servidor RP")
].map(cmd => cmd.toJSON());

client.once("ready", async () => {
  console.log(`✅ Bot online como ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
  const GUILD_ID = "ID_DO_SEU_SERVIDOR"; // Coloque o ID do servidor
  const CLIENT_ID = client.user.id;

  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log("✅ Comando /ajuda registrado");
  } catch (err) {
    console.error(err);
  }
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isCommand()) return;
  if (interaction.commandName === "ajuda") {
    const embed = new EmbedBuilder()
      .setColor("#1f2c34")
      .setTitle("📜 Lista de Comandos Roleplay")
      .setDescription("Aqui estão todos os comandos disponíveis no servidor RP:")
      .addFields(
        { name: "!setrg", value: "Criar seu RG (nome, estado civil, nascimento, gênero)" },
        { name: "!rg", value: "Ver seu RG completo" },
        { name: "!rgeditar", value: "Editar o nome do RG (cargos autorizados)" },
        { name: "!rgdeletar", value: "Deletar RG de um usuário (cargos autorizados)" },
        { name: "!consultar", value: "Consultar RG de outro usuário (cargos autorizados)" },
        { name: "!rgs", value: "Listar todos os RGs cadastrados (mascarado)" },
        { name: "!cassarcnh", value: "Cassação da CNH de um usuário (polícia/judiciário)" },
        { name: "!habilitarcnh", value: "Reativar a CNH de um usuário" },
        { name: "!trabalhar", value: "Ganhar dinheiro RP (precisa de CT)" },
        { name: "!saldo", value: "Ver sua carteira e banco" },
        { name: "!depositar", value: "Depositar dinheiro no banco" },
        { name: "!sacar", value: "Sacar dinheiro do banco" },
        { name: "!comprar", value: "Comprar itens RP" },
        { name: "!prender", value: "Prender um usuário (polícia)" },
        { name: "!liberar", value: "Liberar um usuário preso" },
        { name: "!multar", value: "Aplicar multa (polícia)" },
        { name: "!revistar", value: "Revistar RG, CNH, dinheiro ou itens RP" },
        { name: "!julgar", value: "Aplicar decisão judicial" },
        { name: "!recurso", value: "Recorrer de penalidade" },
        { name: "!casar", value: "Casar com outro usuário" },
        { name: "!divorciar", value: "Divorciar do seu par" },
        { name: "!ficar", value: "Ficar com outro usuário" }
      )
      .setFooter({ text: "Comandos apenas para uso RP" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
});

// ------------------------ Login ------------------------
client.login(process.env.TOKEN);
