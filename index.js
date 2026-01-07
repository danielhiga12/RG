const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const PREFIX = "!";
const DATA_PATH = "./data";
const RG_FILE = `${DATA_PATH}/rgs.json`;
const ECON_FILE = `${DATA_PATH}/economia.json`;
const MANDADOS_FILE = `${DATA_PATH}/mandados.json`;

// CARGOS AUTORIZADOS
const CARGOS_RG_EDIT = ["Fundador", "Gerente de Comunidade", "Monitor", "Administrador"];
const CARGOS_RG_DELETE = ["Fundador", "Gerente de Comunidade", "Monitor"];
const CARGOS_MANDADOS = ["Fundador", "Gerente de Comunidade", "Monitor"];
const CARGOS_POLICIA = ["Polícia Civil","Polícia Militar","Polícia Federal","PRF","Polícia do Exército"];
const CARGOS_ANTECEDENTES = ["Fundador","Gerente de Comunidade","Monitor","Administrador","Moderador"];

// CANAIS DE LOG
const LOG_RG = "logs-rg";
const LOG_POLICIA = "logs-policial";
const LOG_JUDICIARIO = "logs-judiciario";
const LOG_ECONOMIA = "logs-economia";

// CRIAR PASTAS E ARQUIVOS SE NÃO EXISTIREM
if (!fs.existsSync(DATA_PATH)) fs.mkdirSync(DATA_PATH);
if (!fs.existsSync(RG_FILE)) fs.writeFileSync(RG_FILE, "{}");
if (!fs.existsSync(ECON_FILE)) fs.writeFileSync(ECON_FILE, "{}");
if (!fs.existsSync(MANDADOS_FILE)) fs.writeFileSync(MANDADOS_FILE, "{}");

// ======================== FUNÇÕES ========================
function gerarNumero19() {
  let num = "";
  for (let i = 0; i < 19; i++) num += Math.floor(Math.random() * 10);
  return num;
}

function gerarCPF() {
  let cpf = gerarNumero19();
  return cpf.replace(/^(\d{1})(\d{3})(\d{3})(\d{3})(\d{3})(\d{3})$/, "$1.$2.$3.$4.$5.$6");
}

function carregarJSON(file) {
  try { return JSON.parse(fs.readFileSync(file)); }
  catch { return {}; }
}

function salvarJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function calcularIdade(dataNascimento) {
  const [dia, mes, ano] = dataNascimento.split("/").map(Number);
  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  if (hoje.getMonth()+1 < mes || (hoje.getMonth()+1 === mes && hoje.getDate() < dia)) idade--;
  return idade;
}

function logEmbed(guild, canal, titulo, descricao) {
  const channel = guild.channels.cache.find(c => c.name === canal);
  if (!channel) return;
  const embed = new EmbedBuilder()
    .setTitle(titulo)
    .setDescription(descricao)
    .setColor("#1f2c34")
    .setTimestamp();
  channel.send({ embeds: [embed] });
}

// ======================== EVENTO MENSAGEM ========================
client.on("messageCreate", async message => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(" ");
  const comando = args.shift().toLowerCase();

  const rgs = carregarJSON(RG_FILE);
  const economia = carregarJSON(ECON_FILE);
  const mandados = carregarJSON(MANDADOS_FILE);

  // ======================== RG ========================
  if (comando === "setrg") {
    if (rgs[message.author.id]) return message.reply("❌ Você já possui um RG.");
    if (args.length < 4) return message.reply("❌ Use: `!setrg Nome;Estado Civil;DD/MM/AAAA;Gênero`");

    const [nome, estadoCivil, nascimento, genero] = args.join(" ").split(";");
    const idade = calcularIdade(nascimento);
    if (idade < 0 || idade > 120) return message.reply("❌ Data de nascimento inválida.");

    const rg = {
      rg: gerarNumero19(),
      nome: nome.trim(),
      estadoCivil: estadoCivil.trim(),
      nascimento: nascimento.trim(),
      idade,
      genero: genero.trim(),
      cpf: gerarCPF(),
      validade: `${nascimento.split("/")[0]}/${nascimento.split("/")[1]}/${(Number(nascimento.split("/")[2])+20)}`,
      antecedentes: []
    };
    rgs[message.author.id] = rg;
    salvarJSON(RG_FILE, rgs);

    message.reply("✅ **RG criado com sucesso!** Use `!rg` para visualizar.");
    logEmbed(message.guild, LOG_RG, "Novo RG Criado", `📌 ${message.author.tag} criou seu RG.`);
  }

  if (comando === "rg") {
    const rg = rgs[message.author.id];
    if (!rg) return message.reply("❌ Você não possui RG.");

    const embed = new EmbedBuilder()
      .setTitle("🪪 Carteira de Identidade")
      .setDescription("━━━━━━━━━━━━━━━━━━━━")
      .addFields(
        { name: "👤 Nome", value: rg.nome, inline: true },
        { name: "🆔 RG", value: rg.rg, inline: true },
        { name: "💍 Estado Civil", value: rg.estadoCivil, inline: true },
        { name: "🎂 Idade", value: `${rg.idade} anos`, inline: true },
        { name: "💳 CPF", value: rg.cpf, inline: true },
        { name: "⚧ Gênero", value: rg.genero, inline: true },
        { name: "📅 Validade", value: rg.validade, inline: true },
        { name: "📋 Antecedentes", value: rg.antecedentes.length ? rg.antecedentes.map(a => `${a.data}: ${a.descricao} 💵${a.valor}`).join("\n") : "Nenhum", inline: false }
      )
      .setColor("#1f2c34")
      .setFooter({ text: "Documento válido apenas para roleplay" })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  }

  if (comando === "rgeditar") {
    if (!message.member.roles.cache.some(r => CARGOS_RG_EDIT.includes(r.name))) return message.reply("❌ Sem permissão.");
    const user = message.mentions.users.first();
    if (!user) return message.reply("❌ Mencione o usuário.");
    const novoNome = args.slice(1).join(" ");
    if (!rgs[user.id]) return message.reply("❌ Usuário não possui RG.");
    rgs[user.id].nome = novoNome;
    salvarJSON(RG_FILE, rgs);
    message.reply(`✅ Nome do RG de ${user.tag} atualizado para **${novoNome}**`);
    logEmbed(message.guild, LOG_RG, "RG Editado", `✏️ ${message.author.tag} alterou o RG de ${user.tag} para ${novoNome}`);
  }

  if (comando === "rgdeletar") {
    if (!message.member.roles.cache.some(r => CARGOS_RG_DELETE.includes(r.name))) return message.reply("❌ Sem permissão.");
    const user = message.mentions.users.first();
    if (!user || !rgs[user.id]) return message.reply("❌ Usuário não possui RG.");
    delete rgs[user.id];
    salvarJSON(RG_FILE, rgs);
    message.reply(`🗑️ RG de ${user.tag} deletado.`);
    logEmbed(message.guild, LOG_RG, "RG Deletado", `🗑️ ${message.author.tag} deletou o RG de ${user.tag}`);
  }

  // ======================== ECONOMIA ========================
  if (comando === "saldo") {
    if (!economia[message.author.id]) economia[message.author.id] = { dinheiro: 0, banco: 0 };
    const embed = new EmbedBuilder()
      .setTitle("💰 Saldo")
      .setDescription(`💵 Dinheiro: ${economia[message.author.id].dinheiro}\n🏦 Banco: ${economia[message.author.id].banco}`)
      .setColor("#1f2c34");
    message.reply({ embeds: [embed] });
  }

  if (comando === "depositar") {
    const valor = parseInt(args[0]);
    if (!valor || valor <= 0) return message.reply("❌ Valor inválido.");
    if (!economia[message.author.id]) economia[message.author.id] = { dinheiro: 0, banco: 0 };
    if (economia[message.author.id].dinheiro < valor) return message.reply("❌ Você não tem esse dinheiro.");
    economia[message.author.id].dinheiro -= valor;
    economia[message.author.id].banco += valor;
    salvarJSON(ECON_FILE, economia);
    message.reply(`✅ Depositou 💵 ${valor}`);
    logEmbed(message.guild, LOG_ECONOMIA, "Depósito", `${message.author.tag} depositou 💵 ${valor}`);
  }

  if (comando === "sacar") {
    const valor = parseInt(args[0]);
    if (!valor || valor <= 0) return message.reply("❌ Valor inválido.");
    if (!economia[message.author.id]) economia[message.author.id] = { dinheiro: 0, banco: 0 };
    if (economia[message.author.id].banco < valor) return message.reply("❌ Saldo insuficiente.");
    economia[message.author.id].banco -= valor;
    economia[message.author.id].dinheiro += valor;
    salvarJSON(ECON_FILE, economia);
    message.reply(`✅ Sacou 💵 ${valor}`);
    logEmbed(message.guild, LOG_ECONOMIA, "Saque", `${message.author.tag} sacou 💵 ${valor}`);
  }

  if (comando === "transferir") {
    const user = message.mentions.users.first();
    const valor = parseInt(args[1]);
    if (!user || !valor || valor <= 0) return message.reply("❌ Uso: `!transferir @user valor`");
    if (!economia[message.author.id]) economia[message.author.id] = { dinheiro: 0, banco: 0 };
    if (!economia[user.id]) economia[user.id] = { dinheiro: 0, banco: 0 };
    if (economia[message.author.id].dinheiro < valor) return message.reply("❌ Saldo insuficiente.");
    economia[message.author.id].dinheiro -= valor;
    economia[user.id].dinheiro += valor;
    salvarJSON(ECON_FILE, economia);
    message.reply(`✅ Transferiu 💵 ${valor} para ${user.tag}`);
    logEmbed(message.guild, LOG_ECONOMIA, "Transferência", `${message.author.tag} transferiu 💵 ${valor} para ${user.tag}`);
  }

  if (comando === "trabalho") {
    if (!economia[message.author.id]) economia[message.author.id] = { dinheiro: 0, banco: 0 };
    const valor = Math.floor(Math.random() * 500) + 100;
    economia[message.author.id].dinheiro += valor;
    salvarJSON(ECON_FILE, economia);
    message.reply(`💼 Você completou um trabalho diário e recebeu 💵 ${valor}`);
    logEmbed(message.guild, LOG_ECONOMIA, "Trabalho Diário", `${message.author.tag} recebeu 💵 ${valor} no trabalho diário`);
  }

  // ======================== MANDADOS ========================
  if (comando === "mandado") {
    if (!message.member.roles.cache.some(r => CARGOS_MANDADOS.includes(r.name))) return message.reply("❌ Sem permissão.");
    const user = message.mentions.users.first();
    if (!user) return message.reply("❌ Mencione o usuário.");
    mandados[user.id] = { autor: message.author.tag, data: new Date().toLocaleString() };
    salvarJSON(MANDADOS_FILE, mandados);
    message.reply(`✅ Mandado criado para ${user.tag}`);
    logEmbed(message.guild, LOG_JUDICIARIO, "Mandado Criado", `${message.author.tag} criou mandado para ${user.tag}`);
  }

  if (comando === "mandadosativos") {
    const embed = new EmbedBuilder()
      .setTitle("📋 Mandados Ativos")
      .setDescription(Object.entries(mandados).map(([id, info]) => `<@${id}> - Criado por: ${info.autor}`).join("\n") || "Nenhum mandado ativo")
      .setColor("#1f2c34");
    message.reply({ embeds: [embed] });
  }

  if (comando === "removermandado") {
    if (!message.member.roles.cache.some(r => CARGOS_MANDADOS.includes(r.name))) return message.reply("❌ Sem permissão.");
    const user = message.mentions.users.first();
    if (!user || !mandados[user.id]) return message.reply("❌ Usuário sem mandado.");
    delete mandados[user.id];
    salvarJSON(MANDADOS_FILE, mandados);
    message.reply(`✅ Mandado removido de ${user.tag}`);
    logEmbed(message.guild, LOG_JUDICIARIO, "Mandado Removido", `${message.author.tag} removeu mandado de ${user.tag}`);
  }

  // ======================== POLÍCIA / INFRAÇÕES ========================
  if (comando === "registrarinfracao") {
    if (!message.member.roles.cache.some(r => CARGOS_POLICIA.includes(r.name))) return message.reply("❌ Apenas policiais podem registrar infrações.");
    const user = message.mentions.users.first();
    const valor = parseInt(args[1]);
    const descricao = args.slice(2).join(" ");
    if (!user || !valor || !descricao) return message.reply("❌ Uso: !registrarinfracao @user valor descrição");
    if (!rgs[user.id]) return message.reply("❌ Usuário não possui RG.");
    if (!economia[user.id]) economia[user.id] = { dinheiro: 0, banco: 0 };

    // descontar multa
    economia[user.id].dinheiro -= valor;
    if (!rgs[user.id].antecedentes) rgs[user.id].antecedentes = [];
    rgs[user.id].antecedentes.push({ data: new Date().toLocaleDateString(), descricao, valor });

    salvarJSON(RG_FILE, rgs);
    salvarJSON(ECON_FILE, economia);

    message.reply(`✅ Infração registrada para ${user.tag}, multa de 💵 ${valor} aplicada.`);
    logEmbed(message.guild, LOG_POLICIA, "Infração Registrada", `${message.author.tag} aplicou multa de 💵 ${valor} a ${user.tag}: ${descricao}`);
  }

  if (comando === "verantecedentes") {
    if (!message.member.roles.cache.some(r => CARGOS_ANTECEDENTES.includes(r.name))) return message.reply("❌ Sem permissão.");
    const user = message.mentions.users.first();
    if (!user || !rgs[user.id]) return message.reply("❌ Usuário não possui RG.");
    const antecedentes = rgs[user.id].antecedentes || [];
    const embed = new EmbedBuilder()
      .setTitle(`🔍 Antecedentes de ${user.tag}`)
      .setDescription(antecedentes.map(a => `📅 ${a.data} - ${a.descricao} - 💵 ${a.valor}`).join("\n") || "Nenhum antecedente")
      .setColor("#1f2c34");
    message.reply({ embeds: [embed] });
    logEmbed(message.guild, LOG_JUDICIARIO, "Consulta de Antecedentes", `${message.author.tag} consultou antecedentes de ${user.tag}`);
  }

  // ======================== AJUDA ========================
  if (comando === "ajuda") {
    const embed = new EmbedBuilder()
      .setTitle("📬 Lista de Comandos")
      .setDescription(`
**RG / Documentos**
!setrg Nome;Estado Civil;DD/MM/AAAA;Gênero - Criar RG
!rg - Ver seu RG
!rgeditar @user Nome - Editar nome do RG
!rgdeletar @user - Deletar RG

**Economia**
!saldo - Ver saldo
!depositar valor
!sacar valor
!transferir @user valor
!trabalho - Missão diária

**Judiciário / Mandados**
!mandado @user - Criar mandado
!mandadosativos - Ver mandados ativos
!removermandado @user - Remover mandado

**Polícia / Infrações**
!registrarinfracao @user valor descrição - Registrar multa
!verantecedentes @user - Consultar antecedentes

📌 Apenas cargos autorizados podem usar comandos administrativos
      `)
      .setColor("#1f2c34");
    message.reply({ embeds: [embed] });
  }
});

client.on("ready", () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

client.login(process.env.TOKEN);
