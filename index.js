// ------------------------------
// BOT DE RG ROLEPLAY - VERSÃO FINAL COM PERMISSÕES ATUALIZADAS
// ------------------------------

const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const fs = require("fs");

// ------------------------------
// CLIENTE
// ------------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ------------------------------
// VARIÁVEIS
// ------------------------------
const PREFIX = "!";
const RG_FILE = "./rgs.json";
const CANAL_LOG = "logs-rg"; // Nome do canal de logs

// Cargos permitidos para cada comando
const CARGOS_RGEDITAR = ["Fundador", "Gerente de Comunidade", "Monitor", "Administrador"];
const CARGOS_RGDELETAR = ["Fundador", "Gerente de Comunidade", "Monitor"];

// ------------------------------
// FUNÇÕES AUXILIARES
// ------------------------------
function gerarNumero19() {
  let num = "";
  for (let i = 0; i < 19; i++) num += Math.floor(Math.random() * 10);
  return num;
}

function gerarCPF() {
  let cpf = gerarNumero19();
  return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{10})$/, "$1.$2.$3.$4");
}

function carregarRGs() {
  if (!fs.existsSync(RG_FILE)) fs.writeFileSync(RG_FILE, "{}");
  return JSON.parse(fs.readFileSync(RG_FILE));
}

function salvarRGs(data) {
  fs.writeFileSync(RG_FILE, JSON.stringify(data, null, 2));
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

// Função para mascarar RG e CPF
function mascarar(valor) {
  return valor.slice(0, 3) + "*".repeat(valor.length - 6) + valor.slice(-3);
}

// Enviar log no canal específico
function enviarLog(guild, mensagem) {
  const canal = guild.channels.cache.find(c => c.name === CANAL_LOG && c.isTextBased());
  if (canal) canal.send(mensagem);
}

// ------------------------------
// EVENTO MESSAGE
// ------------------------------
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const rgs = carregarRGs();
  const content = message.content.slice(PREFIX.length).trim();
  const split = content.split(" ");
  const comando = split.shift().toLowerCase();

  // ------------------------------
  // !setrg
  // ------------------------------
  if (comando === "setrg") {
    if (rgs[message.author.id])
      return message.reply("❌ Você já possui um RG registrado.");

    if (split.length < 4)
      return message.reply(
        "❌ Uso correto:\n`!setrg Nome Completo EstadoCivil DD/MM/AAAA Gênero`"
      );

    const estadoCivilIndex = split.length - 3;
    const nome = split.slice(0, estadoCivilIndex).join(" ");
    const estadoCivil = split[estadoCivilIndex];
    const nascimento = split[estadoCivilIndex + 1];
    const genero = split[estadoCivilIndex + 2];

    const idade = calcularIdade(nascimento);
    if (idade < 0 || idade > 120) return message.reply("❌ Data de nascimento inválida.");

    const rg = {
      rg: gerarNumero19(),
      nome,
      estadoCivil,
      nascimento,
      genero,
      idade,
      cpf: gerarCPF()
    };

    rgs[message.author.id] = rg;
    salvarRGs(rgs);

    message.reply("✅ **RG criado com sucesso!** Use `!rg` para visualizar.");
    enviarLog(message.guild, `🆕 RG criado para **${message.author.tag}**`);
  }

  // ------------------------------
  // !rg
  // ------------------------------
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
        { name: "🔢 Idade", value: `${rg.idade} anos`, inline: true }
      )
      .setFooter({ text: "Documento válido apenas para roleplay" })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  }

  // ------------------------------
  // !rgeditar
  // ------------------------------
  if (comando === "rgeditar") {
    const possuiCargo = message.member.roles.cache.some(r => CARGOS_RGEDITAR.includes(r.name));
    if (!possuiCargo) return message.reply("❌ Você não tem permissão para usar este comando.");

    const user = message.mentions.users.first();
    if (!user) return message.reply("❌ Mencione o usuário.");
    if (!rgs[user.id]) return message.reply("❌ Este usuário não possui RG.");

    const novoNome = split.slice(1).join(" ");
    if (!novoNome) return message.reply("❌ Digite o novo nome após a menção.");

    rgs[user.id].nome = novoNome;
    salvarRGs(rgs);

    message.reply(`✅ Nome do RG de **${user.tag}** alterado para **${novoNome}**.`);
    enviarLog(message.guild, `✏️ RG de **${user.tag}** editado por **${message.author.tag}**. Novo nome: ${novoNome}`);
  }

  // ------------------------------
  // !rgdeletar
  // ------------------------------
  if (comando === "rgdeletar") {
    const possuiCargo = message.member.roles.cache.some(r => CARGOS_RGDELETAR.includes(r.name));
    if (!possuiCargo) return message.reply("❌ Você não tem permissão para usar este comando.");

    const user = message.mentions.users.first();
    if (!user) return message.reply("❌ Mencione o usuário.");
    if (!rgs[user.id]) return message.reply("❌ Este usuário não possui RG.");

    delete rgs[user.id];
    salvarRGs(rgs);

    message.reply("🗑️ RG deletado com sucesso.");
    enviarLog(message.guild, `🗑️ RG deletado por **${message.author.tag}** de **${user.tag}**`);
  }

  // ------------------------------
  // !rgs
  // ------------------------------
  if (comando === "rgs") {
    const possuiCargo = message.member.roles.cache.some(r => CARGOS_RGEDITAR.includes(r.name));
    if (!possuiCargo) return message.reply("❌ Você não tem permissão para usar este comando.");

    let lista = Object.entries(rgs).map(([id, rg]) => {
      const user = message.guild.members.cache.get(id);
      return `👤 **${user ? user.user.tag : "Desconhecido"}** - ${rg.nome}, ${rg.idade} anos - RG: ${mascarar(rg.rg)} - CPF: ${mascarar(rg.cpf)}`;
    }).join("\n");

    if (!lista) lista = "Nenhum RG registrado.";

    message.reply(`📜 **Lista de RGs:**\n${lista}`);
    enviarLog(message.guild, `📜 ${message.author.tag} consultou a lista de RGs`);
  }
});

// ------------------------------
// LOGIN DO BOT
// ------------------------------
client.login(process.env.TOKEN);
