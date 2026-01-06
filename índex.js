const { Client, IntentsBitField, EmbedBuilder } = require("discord.js");
const mongoose = require("mongoose");

// ----------------------
// Conectar ao MongoDB
// ----------------------
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ Conectado ao MongoDB"))
  .catch(err => console.log("❌ Erro ao conectar MongoDB:", err));

// ----------------------
// Schema do RG
// ----------------------
const rgSchema = new mongoose.Schema({
  userId: String,
  nome: String,
  estadoCivil: String,
  nascimento: String,
  genero: String,
  idade: Number,
  cpf: String,
  rg: String
});

const RG = mongoose.model("RG", rgSchema);

// ----------------------
// Cliente Discord
// ----------------------
const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds, 
    IntentsBitField.Flags.GuildMessages, 
    IntentsBitField.Flags.MessageContent
  ]
});

// IDs dos cargos que podem deletar RGs
const CARGOS_AUTORIZADOS = [
  "ID_DO_CARGO_1",
  "ID_DO_CARGO_2"
];

// ----------------------
// Funções auxiliares
// ----------------------
function gerarNumeroComPontos(digitos) {
  let numeros = "";
  for (let i = 0; i < digitos; i++) numeros += Math.floor(Math.random() * 10);
  return numeros.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function calcularIdade(dataNascimento) {
  const [dia, mes, ano] = dataNascimento.split("/").map(Number);
  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  const m = hoje.getMonth() + 1;
  if (m < mes || (m === mes && hoje.getDate() < dia)) idade--;
  return idade;
}

// ----------------------
// Eventos de mensagem
// ----------------------
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const args = message.content.trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // -------------------------------
  // !setrg → criar RG
  // -------------------------------
  if (command === "!setrg") {
    if (args.length < 4) return message.reply("❌ Uso: `!setrg Nome Completo EstadoCivil DD/MM/AAAA Gênero`");

    const genero = args[args.length - 1];
    const nascimento = args[args.length - 2];
    const estadoCivil = args[args.length - 3];
    const nome = args.slice(0, args.length - 3).join(" ");

    const idade = calcularIdade(nascimento);
    const cpf = gerarNumeroComPontos(19);
    const rg = gerarNumeroComPontos(19);

    // Verifica se já existe RG do usuário
    let rgDoc = await RG.findOne({ userId: message.author.id });
    if (!rgDoc) {
      rgDoc = new RG({ userId: message.author.id });
    }

    // Atualiza os dados
    rgDoc.nome = nome;
    rgDoc.estadoCivil = estadoCivil;
    rgDoc.nascimento = nascimento;
    rgDoc.genero = genero;
    rgDoc.idade = idade;
    rgDoc.cpf = cpf;
    rgDoc.rg = rg;

    await rgDoc.save();

    const embed = new EmbedBuilder()
      .setColor("#2f3136")
      .setTitle("🪪 Carteira de Identidade")
      .setDescription(`**RG Nº:** ${rg}\n\n**${nome}**`)
      .addFields(
        { name: "Estado Civil", value: estadoCivil, inline: true },
        { name: "Gênero", value: genero, inline: true },
        { name: "Data de Nascimento", value: nascimento, inline: true },
        { name: "Idade", value: `${idade} anos`, inline: true },
        { name: "CPF", value: cpf, inline: false }
      )
      .setFooter({ text: "Documento fictício • Roleplay" });

    message.channel.send({ embeds: [embed] });
  }

  // -------------------------------
  // !rg → ver RG próprio
  // -------------------------------
  if (command === "!rg") {
    const rgDoc = await RG.findOne({ userId: message.author.id });
    if (!rgDoc) return message.reply("❌ Você ainda não criou um RG. Use `!setrg`.");

    const embed = new EmbedBuilder()
      .setColor("#2f3136")
      .setTitle("🪪 Carteira de Identidade")
      .setDescription(`**RG Nº:** ${rgDoc.rg}\n\n**${rgDoc.nome}**`)
      .addFields(
        { name: "Estado Civil", value: rgDoc.estadoCivil, inline: true },
        { name: "Gênero", value: rgDoc.genero, inline: true },
        { name: "Data de Nascimento", value: rgDoc.nascimento, inline: true },
        { name: "Idade", value: `${rgDoc.idade} anos`, inline: true },
        { name: "CPF", value: rgDoc.cpf, inline: false }
      )
      .setFooter({ text: `Solicitado por ${message.author.username}` });

    message.channel.send({ embeds: [embed] });
  }

  // -------------------------------
  // !rgdeletar → deletar RG (cargos específicos)
  // -------------------------------
  if (command === "!rgdeletar") {
    const temPermissao = message.member.roles.cache.some(role => CARGOS_AUTORIZADOS.includes(role.id));
    if (!temPermissao) return message.reply("❌ Você não tem permissão para usar este comando.");

    const usuario = message.mentions.users.first();
    if (!usuario) return message.reply("❌ Use: `!rgdeletar @usuário`");

    const rgDoc = await RG.findOne({ userId: usuario.id });
    if (!rgDoc) return message.reply("❌ Este usuário não possui RG.");

    await RG.deleteOne({ userId: usuario.id });
    message.channel.send(`✅ RG de **${usuario.username}** foi deletado com sucesso.`);
  }
});

// ----------------------
// LOGIN DO BOT
// ----------------------
client.login(process.env.DISCORD_TOKEN);

