const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const axios = require("axios");
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const PREFIX = "!";
const RG_FILE = "./policia-site/data/rgs.json";
const MULTAS_FILE = "./policia-site/data/multas.json";
const VEICULOS_FILE = "./policia-site/data/veiculos.json";

// Funções utilitárias
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
  if (!fs.existsSync(file)) fs.writeFileSync(file, "{}");
  const data = fs.readFileSync(file);
  if (data.length === 0) return {};
  return JSON.parse(data);
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

// Logs
function logEmbed(guild, canal, embed) {
  const logChannel = guild.channels.cache.find(c => c.name === canal);
  if (logChannel) logChannel.send({ embeds: [embed] });
}

// Comandos
client.on("messageCreate", async message => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;
  const args = message.content.slice(PREFIX.length).split(";");
  const cmd = args.shift().toLowerCase();

  const rgs = carregarJSON(RG_FILE);

  // !setrg
  if (cmd === "setrg") {
    if (rgs[message.author.id]) return message.reply("❌ Você já possui um RG.");
    if (args.length < 4) return message.reply("❌ Use: `!setrg Nome;Estado Civil;DD/MM/AAAA;Gênero`");

    const idade = calcularIdade(args[2]);
    if (idade < 0 || idade > 120) return message.reply("❌ Data de nascimento inválida.");

    const rg = {
      rg: gerarNumero19(),
      nome: args[0],
      estadoCivil: args[1],
      nascimento: args[2],
      genero: args[3],
      idade: idade,
      cpf: gerarCPF(),
      validade: `${args[2].split("/")[0]}/${args[2].split("/")[1]}/${parseInt(args[2].split("/")[2])+20}`,
      status: "Válido",
      antecedentes: []
    };

    rgs[message.author.id] = rg;
    salvarJSON(RG_FILE, rgs);

    const embed = new EmbedBuilder()
      .setTitle("🪪 Carteira de Identidade")
      .setDescription(
        `👤 Nome: ${rg.nome}\n🆔 RG: ${rg.rg}\n💍 Estado Civil: ${rg.estadoCivil}\n🎂 Idade: ${rg.idade}\n📄 CPF: ${rg.cpf}\n⚧ Gênero: ${rg.genero}\n✅ Status: ${rg.status}\n📅 Validade: ${rg.validade}`
      )
      .setColor("Green");
    message.reply({ embeds: [embed] });
    logEmbed(message.guild, "logs-rg", embed);
  }

  // !rg
  if (cmd === "rg") {
    const rg = rgs[message.author.id];
    if (!rg) return message.reply("❌ Você não possui RG.");
    const embed = new EmbedBuilder()
      .setTitle("🪪 Carteira de Identidade")
      .setDescription(
        `👤 Nome: ${rg.nome}\n🆔 RG: ${rg.rg}\n💍 Estado Civil: ${rg.estadoCivil}\n🎂 Idade: ${rg.idade}\n📄 CPF: ${rg.cpf}\n⚧ Gênero: ${rg.genero}\n✅ Status: ${rg.status}\n📅 Validade: ${rg.validade}`
      )
      .setColor("Blue");
    message.reply({ embeds: [embed] });
  }

  // Aqui você adiciona os outros comandos: !rgdeletar, !rgeditar, !consultar, !mandosativos, !removermandado, !ajuda, economia, polícia, judiciário...
  // Todos com logs separados por categoria e permissões de cargos.
});

client.login(process.env.BOT_TOKEN);
