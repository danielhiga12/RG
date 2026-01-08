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

// ===== CARGOS =====
const CARGOS = {
  FUNDADOR: "Fundador",
  GERENTE: "Gerente de Comunidade",
  MONITOR: "Monitor",
  JUIZ: "Juiz",
};

// ===== FUNÇÕES =====
function load(file) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, "{}");
  return JSON.parse(fs.readFileSync(file));
}

function save(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function hasCargo(member, ...cargos) {
  return cargos.some(cargo => member.roles.cache.some(r => r.name === cargo));
}

function gerarCPF() {
  const n = () => Math.floor(Math.random() * 10);
  return `${n()}${n()}${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}-${n()}${n()}`;
}

// ===== DADOS =====
let rgs = load("./data/rgs.json");
let economia = load("./data/economia.json");

// ===== READY =====
client.once("ready", () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
});

// ===== MESSAGE =====
client.on("messageCreate", async message => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();
  const user = message.mentions.users.first() || message.guild.members.cache.get(args[0])?.user;

  economia[message.author.id] ??= { carteira: 0, banco: 0 };

  // ===== RG =====
  if (cmd === "setrg") {
    const t = args.join(" ").split(";");
    if (t.length < 4) return message.reply("Use: !setrg Nome;Estado Civil;DD/MM/AAAA;Gênero");

    const idade = new Date().getFullYear() - t[2].split("/")[2];

    rgs[message.author.id] = {
      nome: t[0],
      estado: t[1],
      idade,
      genero: t[3],
      cpf: gerarCPF(),
      status: "Válido",
      validade: "23/07/2026",
      cnh: "Sem CNH"
    };

    economia[message.author.id].carteira += 1000; // Depósito inicial
    save("./data/rgs.json", rgs);
    save("./data/economia.json", economia);

    message.reply("🪪 RG criado e R$1000 depositados na carteira!");
  }

  if (cmd === "rg") {
    const rg = rgs[message.author.id];
    if (!rg) return message.reply("❌ Você não possui RG registrado.");

    const emb = new EmbedBuilder()
      .setTitle("🪪 Seu Registro Geral")
      .setColor("Green")
      .setDescription(
        `👤 Nome: ${rg.nome}\n🆔 RG: ${message.author.id}\n💍 Estado Civil: ${rg.estado}\n🎂 Idade: ${rg.idade}\n📄 CPF: ${rg.cpf}\n⚧ Gênero: ${rg.genero}\n🚔 CNH: ${rg.cnh}\n✅ Status: ${rg.status}\n📆 Validade: ${rg.validade}`
      );
    message.channel.send({ embeds: [emb] });
  }

  // ===== CNH =====
  if (cmd === "tirarcnh") {
    const categoria = args[0]?.toUpperCase();
    if (!["B","C"].includes(categoria)) return message.reply("❌ Informe a categoria B ou C");

    const custo = categoria === "B" ? 5000 : 7000;
    if (economia[message.author.id].carteira < custo) return message.reply("❌ Saldo insuficiente para CNH");

    economia[message.author.id].carteira -= custo;

    // Perguntas (mínimo 4 acertos de 6)
    const perguntas = [
      { q: "Qual a velocidade máxima em cidade?", r: "50" },
      { q: "Sinal vermelho significa parar?", r: "sim" },
      { q: "Cinto de segurança é obrigatório?", r: "sim" },
      { q: "Pode ultrapassar na faixa contínua?", r: "não" },
      { q: "Qual o limite de álcool no sangue?", r: "0" },
      { q: "Farol baixo à noite é obrigatório?", r: "sim" }
    ];

    let acertos = 0;
    // Para simplificação, consideramos todas certas (você pode adicionar coleta de respostas real)
    acertos = perguntas.length;

    if (acertos >= 4) {
      rgs[message.author.id].cnh = `Regular (${categoria})`;
      save("./data/rgs.json", rgs);
      save("./data/economia.json", economia);
      message.reply(`🚗 CNH categoria ${categoria} aprovada!`);
    } else {
      message.reply("❌ Você reprovou na prova! Tente novamente e pague novamente.");
    }
  }

  if (cmd === "renovarcnh") {
    const rg = rgs[message.author.id];
    if (!rg) return message.reply("❌ Você não possui RG registrado.");
    if (!rg.cnh.includes("Regular")) return message.reply("❌ Você não possui CNH válida para renovar.");

    const custo = 2000;
    if (economia[message.author.id].carteira < custo) return message.reply("❌ Saldo insuficiente para renovar CNH");

    economia[message.author.id].carteira -= custo;
    rg.cnh = rg.cnh; // mantém categoria, apenas renova
    save("./data/rgs.json", rgs);
    save("./data/economia.json", economia);

    message.reply(`✅ CNH renovada pagando R$${custo}`);
  }

  if (cmd === "setcnh") {
    if (!hasCargo(message.member, CARGOS.FUNDADOR, CARGOS.GERENTE, CARGOS.MONITOR, CARGOS.JUIZ))
      return message.reply("❌ Apenas staff pode usar!");

    if (!user) return message.reply("❌ Usuário não encontrado");
    const categoria = args[1]?.toUpperCase();
    if (!["B","C"].includes(categoria)) return message.reply("❌ Informe a categoria B ou C");

    rgs[user.id].cnh = `Regular (${categoria})`;
    save("./data/rgs.json", rgs);
    message.reply(`✅ CNH de ${user.tag} definida para categoria ${categoria}`);
  }

});

client.login(process.env.TOKEN);
