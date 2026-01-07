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
  POLICIA: "Polícia",
  JUIZ: "Juiz",
  GOVERNADOR: "Governador",
  FUNDADOR: "Fundador"
};

// ===== CONFIG =====
const IMPOSTO_MULTA = 0.1;

// ===== FUNÇÕES =====
function load(file) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, "{}");
  return JSON.parse(fs.readFileSync(file));
}
function save(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
function hasCargo(member, cargo) {
  return member.roles.cache.some(r => r.name === cargo);
}
function gerarCPF() {
  const n = () => Math.floor(Math.random() * 10);
  return `${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}.${n()}${n()}`;
}
function log(guild, canal, titulo, desc, cor="Blue") {
  const c = guild.channels.cache.find(ch => ch.name === canal);
  if (!c) return;
  const e = new EmbedBuilder()
    .setTitle(titulo)
    .setDescription(desc)
    .setColor(cor)
    .setTimestamp();
  c.send({ embeds: [e] });
}

// ===== DADOS =====
let rgs = load("./data/rgs.json");
let economia = load("./data/economia.json");
let antecedentes = load("./data/antecedentes.json");
let mandados = load("./data/mandados.json");
let multas = load("./data/multas.json");
let processos = load("./data/processos.json");
let governo = load("./data/governo.json");
let veiculos = load("./data/veiculos.json");

// ===== READY =====
client.once("ready", () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
});

// ===== MESSAGE =====
client.on("messageCreate", async message => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(1).split(" ");
  const cmd = args.shift().toLowerCase();
  const user = message.mentions.users.first();

  economia[message.author.id] ??= { carteira: 0, banco: 0 };
  governo.caixa ??= 0;

  // ================= RG =================
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

    economia[message.author.id].carteira += 1000; // bônus inicial

    save("./data/rgs.json", rgs);
    save("./data/economia.json", economia);

    message.reply("🪪 RG criado com sucesso e 1000 depositados na carteira!");
  }

  if (cmd === "rg") {
    if (!rgs[message.author.id])
      return message.reply("❌ Você não possui RG registrado");

    const rg = rgs[message.author.id];

    const emb = new EmbedBuilder()
      .setTitle("🪪 Seu Registro Geral")
      .setColor("Green")
      .setDescription(
`👤 Nome: ${rg.nome}
🆔 RG: ${message.author.id}
💍 Estado Civil: ${rg.estado}
🎂 Idade: ${rg.idade}
📄 CPF: ${rg.cpf}
⚧ Gênero: ${rg.genero}
🚔 CNH: ${rg.cnh}
📋 Antecedentes: ${antecedentes[message.author.id]?.length || "Nenhum"}
✅ Status: ${rg.status}
📆 Validade: ${rg.validade}`
      );

    message.channel.send({ embeds: [emb] });
  }

  if (cmd === "setcnh") {
    if (!rgs[user?.id]) return message.reply("❌ Usuário não possui RG");
    rgs[user.id].cnh = args[0] || "Regular";
    save("./data/rgs.json", rgs);
    message.reply(`🚔 CNH de ${user.tag} definida como ${rgs[user.id].cnh}`);
  }

  // ================= ECONOMIA =================
  if (cmd === "saldo") {
    message.reply(`💰 Carteira: ${economia[message.author.id].carteira}\n🏦 Banco: ${economia[message.author.id].banco}`);
  }

  if (cmd === "depositar") {
    const v = Number(args[0]);
    if (isNaN(v) || v <= 0) return message.reply("❌ Valor inválido");
    if (economia[message.author.id].carteira < v) return message.reply("❌ Saldo insuficiente");

    economia[message.author.id].carteira -= v;
    economia[message.author.id].banco += v;
    governo.caixa += v * 0.05;
    save("./data/economia.json", economia);
    save("./data/governo.json", governo);
    message.reply(`🏦 Depósito realizado: ${v}`);
  }

  if (cmd === "sacar") {
    const v = Number(args[0]);
    if (isNaN(v) || v <= 0) return message.reply("❌ Valor inválido");
    if (economia[message.author.id].banco < v) return message.reply("❌ Saldo insuficiente");

    economia[message.author.id].banco -= v;
    economia[message.author.id].carteira += v;
    save("./data/economia.json", economia);
    message.reply(`💵 Saque realizado: ${v}`);
  }

  if (cmd === "transferir") {
    if (!user) return message.reply("❌ Marque um usuário");
    const v = Number(args[0]);
    if (isNaN(v) || v <= 0) return message.reply("❌ Valor inválido");
    if (economia[message.author.id].carteira < v) return message.reply("❌ Saldo insuficiente");

    economia[message.author.id].carteira -= v;
    economia[user.id] ??= { carteira: 0, banco: 0 };
    economia[user.id].carteira += v;
    save("./data/economia.json", economia);
    message.reply(`💸 Transferidos ${v} para ${user.tag}`);
  }

  if (cmd === "addmoney") {
    if (!hasCargo(message.member, CARGOS.FUNDADOR)) return;
    if (!user) return message.reply("❌ Marque um usuário");
    const v = Number(args[0]);
    if (isNaN(v) || v <= 0) return message.reply("❌ Valor inválido");

    economia[user.id] ??= { carteira: 0, banco: 0 };
    economia[user.id].carteira += v;
    save("./data/economia.json", economia);
    log(message.guild, "logs-economia", "💰 Dinheiro adicionado", `${user.tag}`);
    message.reply(`💰 ${v} adicionados para ${user.tag}`);
  }

  if (cmd === "removermoney") {
    if (!hasCargo(message.member, CARGOS.FUNDADOR)) return;
    if (!user) return message.reply("❌ Marque um usuário");
    const v = Number(args[0]);
    if (isNaN(v) || v <= 0) return message.reply("❌ Valor inválido");

    economia[user.id] ??= { carteira: 0, banco: 0 };
    economia[user.id].carteira -= v;
    save("./data/economia.json", economia);
    log(message.guild, "logs-economia", "💸 Dinheiro removido", `${user.tag}`);
    message.reply(`💸 ${v} removidos de ${user.tag}`);
  }

  if (cmd === "top10") {
    const ranking = Object.entries(economia)
      .map(([id, data]) => ({ id, total: data.carteira + data.banco }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    if (ranking.length === 0) return message.reply("❌ Nenhum jogador encontrado");

    let msg = "💰 **Top 10 Mais Ricos do Servidor**\n";
    ranking.forEach((jogador, i) => {
      const userTag = message.guild.members.cache.get(jogador.id)?.user.tag || "Desconhecido";
      msg += `\n${i + 1}. ${userTag} - 💵 ${jogador.total}`;
    });

    message.channel.send(msg);
  }

  // ================= POLÍCIA =================
  if (cmd === "addmandado") {
    if (!hasCargo(message.member, CARGOS.POLICIA)) return;
    if (!user) return message.reply("❌ Marque um usuário");
    mandados[user.id] = { motivo: args.slice(1).join(" "), ativo: true };
    save("./data/mandados.json", mandados);
    log(message.guild, "logs-policia", "🚔 Mandado emitido", user.tag, "Red");
    message.reply("🚨 Mandado criado");
  }

  if (cmd === "removermandado") {
    if (!hasCargo(message.member, CARGOS.POLICIA)) return;
    if (!user) return message.reply("❌ Marque um usuário");
    delete mandados[user.id];
    save("./data/mandados.json", mandados);
    message.reply("✅ Mandado removido");
  }

  if (cmd === "multar") {
    if (!hasCargo(message.member, CARGOS.POLICIA)) return;
    if (!user) return message.reply("❌ Marque um usuário");
    const valor = Number(args[0]);
    if (isNaN(valor) || valor <= 0) return message.reply("❌ Valor inválido");

    multas[user.id] ??= [];
    multas[user.id].push({ valor, motivo: args.slice(1).join(" ") });

    economia[user.id].carteira -= valor;
    governo.caixa += valor * IMPOSTO_MULTA;

    save("./data/multas.json", multas);
    save("./data/economia.json", economia);
    save("./data/governo.json", governo);

    log(message.guild, "logs-economia", "💸 Multa aplicada", `Valor: ${valor}`, "Red");
    message.reply("🚔 Multa registrada");
  }

  if (cmd === "consultar") {
    if (!hasCargo(message.member, CARGOS.POLICIA) && !hasCargo(message.member, CARGOS.JUIZ))
      return message.reply("❌ Sem permissão");
    if (!user || !rgs[user.id]) return message.reply("RG não encontrado");

    const rg = rgs[user.id];
    const emb = new EmbedBuilder()
      .setTitle("🪪 Carteira de Identidade")
      .setColor("Blue")
      .setDescription(
`👤 Nome: ${rg.nome}
🆔 RG: ${user.id}
💍 Estado Civil: ${rg.estado}
🎂 Idade: ${rg.idade}
📄 CPF: ${rg.cpf}
⚧ Gênero: ${rg.genero}
🚔 CNH: ${rg.cnh}
📋 Antecedentes: ${antecedentes[user.id]?.length || "Nenhum"}
✅ Status: ${rg.status}`
      );
    message.channel.send({ embeds: [emb] });
  }

  // ================= Judiciário =================
  if (cmd === "abrirprocesso") {
    if (!hasCargo(message.member, CARGOS.JUIZ)) return;
    if (!user) return message.reply("❌ Marque um usuário");
    processos[user.id] = { juiz: message.author.tag, status: "Aberto" };
    save("./data/processos.json", processos);
    log(message.guild, "logs-judiciario", "⚖️ Processo aberto", user.tag);
  }

  if (cmd === "encerrarprocesso") {
    if (!hasCargo(message.member, CARGOS.JUIZ)) return;
    if (!user) return message.reply("❌ Marque um usuário");
    processos[user.id].status = "Encerrado";
    save("./data/processos.json", processos);
    message.reply("⚖️ Processo encerrado");
  }

  if (cmd === "suspendercnh") {
    if (!hasCargo(message.member, CARGOS.JUIZ)) return;
    if (!user) return message.reply("❌ Marque um usuário");
    rgs[user.id].cnh = "Suspensa";
    save("./data/rgs.json", rgs);
    message.reply("🚫 CNH suspensa");
  }

  if (cmd === "cassarcnh") {
    if (!hasCargo(message.member, CARGOS.JUIZ)) return;
    if (!user) return message.reply("❌ Marque um usuário");
    rgs[user.id].cnh = "Cassada";
    save("./data/rgs.json", rgs);
    message.reply("🚫 CNH cassada");
  }

  if (cmd === "regularcnh") {
    if (!hasCargo(message.member, CARGOS.JUIZ)) return;
    if (!user) return message.reply("❌ Marque um usuário");
    rgs[user.id].cnh = "Regular";
    save("./data/rgs.json", rgs);
    message.reply("✅ CNH regularizada");
  }

  if (cmd === "invalidarrg") {
    if (!hasCargo(message.member, CARGOS.JUIZ)) return;
    if (!user) return message.reply("❌ Marque um usuário");
    rgs[user.id].status = "Inválido";
    save("./data/rgs.json", rgs);
  }

  if (cmd === "regularizarrg") {
    if (!hasCargo(message.member, CARGOS.JUIZ)) return;
    if (!user) return message.reply("❌ Marque um usuário");
    rgs[user.id].status = "Válido";
    save("./data/rgs.json", rgs);
  }

  // ================= AJUDA =================
  if (cmd === "ajuda") {
    message.reply(`
🪪 **RG**
!setrg Nome;Estado Civil;DD/MM/AAAA;Gênero - Criar RG
!rg - Ver seu próprio RG
!setcnh @usuario tipo - Definir CNH
!consultar @usuario - Consultar RG (Polícia/Juiz)

💰 **Economia**
!saldo - Ver saldo
!depositar valor - Depositar no banco
!sacar valor - Sacar do banco
!transferir @usuario valor - Transferir dinheiro
!addmoney @usuario valor - Adicionar dinheiro (Fundador)
!removermoney @usuario valor - Remover dinheiro (Fundador)
!top10 - Ver os 10 mais ricos

🚔 **Polícia**
!addmandado @usuario motivo - Criar mandado
!removermandado @usuario - Remover mandado
!multar @usuario valor motivo - Multar jogador
!consultar @usuario - Consultar RG
!addantecedente @usuario motivo - Adicionar antecedente
!verantecedentes @usuario - Ver antecedentes
!limparantecedentes @usuario - Limpar antecedentes (Juiz)

⚖️ **Judiciário**
!abrirprocesso @usuario - Abrir processo
!encerrarprocesso @usuario - Encerrar processo
!suspendercnh @usuario - Suspender CNH
!cassarcnh @usuario - Cassar CNH
!regularcnh @usuario - Regularizar CNH
!invalidarrg @usuario - Tornar RG inválido
!regularizarrg @usuario - Tornar RG válido
`);
  }
});

client.login(process.env.TOKEN);
