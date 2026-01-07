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
  FUNDADOR: "Fundador",
  BOMBEIRO: "Bombeiro",
  MEDICO: "Medico",
  PARAMEDICO: "Paramedico"
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
let empregos = load("./data/empregos.json");
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

    economia[message.author.id].carteira += 1000; // Depósito inicial

    save("./data/rgs.json", rgs);
    save("./data/economia.json", economia);
    message.reply("🪪 RG criado com sucesso e 1000 depositados na sua carteira!");
  }

  if (cmd === "rg") {
    if (!rgs[message.author.id]) return message.reply("❌ Você não possui RG registrado");
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

  // ================= ECONOMIA =================
  if (cmd === "saldo") {
    message.reply(`💰 Carteira: ${economia[message.author.id].carteira}\n🏦 Banco: ${economia[message.author.id].banco}`);
  }

  if (cmd === "depositar") {
    const v = Number(args[0]);
    economia[message.author.id].carteira -= v;
    economia[message.author.id].banco += v;
    governo.caixa += v * 0.05;
    save("./data/economia.json", economia);
    save("./data/governo.json", governo);
    message.reply("🏦 Depósito realizado");
  }

  if (cmd === "sacar") {
    const v = Number(args[0]);
    economia[message.author.id].banco -= v;
    economia[message.author.id].carteira += v;
    save("./data/economia.json", economia);
    message.reply("💵 Saque realizado");
  }

  if (cmd === "transferir") {
    const v = Number(args[1]);
    if (!user || v <= 0) return message.reply("❌ Uso: !transferir @usuario valor");
    if (economia[message.author.id].carteira < v) return message.reply("❌ Saldo insuficiente");

    economia[message.author.id].carteira -= v;
    economia[user.id] ??= { carteira: 0, banco: 0 };
    economia[user.id].carteira += v;

    save("./data/economia.json", economia);
    message.reply(`💸 Transferência de ${v} realizada para ${user.tag}`);
  }

  if ((cmd === "addmoney" || cmd === "removermoney") && 
      (hasCargo(message.member, CARGOS.FUNDADOR) || 
       hasCargo(message.member, "Gerente de Comunidade") ||
       hasCargo(message.member, "Monitor"))) {
    if (!user) return message.reply("❌ Marque um usuário");
    const valor = Number(args[1]);
    if (isNaN(valor)) return message.reply("❌ Valor inválido");

    if (cmd === "addmoney") economia[user.id].carteira += valor;
    else economia[user.id].carteira -= valor;

    save("./data/economia.json", economia);
    log(message.guild, "logs-economia", cmd === "addmoney" ? "💰 Dinheiro adicionado" : "💸 Dinheiro removido", `${user.tag}`);
    return message.reply(`✅ Dinheiro ${cmd === "addmoney" ? "adicionado" : "removido"} com sucesso`);
  }

  // ================= POLÍCIA =================
  if (cmd === "consultar") {
    if (!hasCargo(message.member, CARGOS.POLICIA) && !hasCargo(message.member, CARGOS.JUIZ))
      return message.reply("❌ Sem permissão");

    let alvo;
    if (user) alvo = user;
    else if (args[0]) { // Procurar pelo RG
      const id = args[0];
      if (!rgs[id]) return message.reply("❌ RG não encontrado");
      alvo = { id };
    } else return message.reply("❌ Marque um usuário ou passe o RG");

    const rg = rgs[alvo.id];
    const emb = new EmbedBuilder()
      .setTitle("🪪 Carteira de Identidade")
      .setColor("Blue")
      .setDescription(
`👤 Nome: ${rg.nome}
🆔 RG: ${alvo.id}
💍 Estado Civil: ${rg.estado}
🎂 Idade: ${rg.idade}
📄 CPF: ${rg.cpf}
⚧ Gênero: ${rg.genero}
🚔 CNH: ${rg.cnh}
📋 Antecedentes: ${antecedentes[alvo.id]?.length || "Nenhum"}
✅ Status: ${rg.status}`
      );
    message.channel.send({ embeds: [emb] });
  }

  if (cmd === "addmandado") {
    if (!hasCargo(message.member, CARGOS.POLICIA)) return;
    if (!user) return message.reply("❌ Marque um usuário");
    mandados[user.id] = { motivo: args.slice(1).join(" "), ativo: true };
    save("./data/mandados.json", mandados);
    log(message.guild, "logs-policia", "🚔 Mandado emitido", user.tag, "Red");
    message.reply("🚨 Mandado criado");
  }

  if (cmd === "mandadosativos") {
    if (!hasCargo(message.member, CARGOS.POLICIA)) return;
    const ativos = Object.entries(mandados).filter(([id, m]) => m.ativo).map(([id, m]) => `<@${id}>: ${m.motivo}`);
    message.reply(ativos.length ? `🚨 Mandados ativos:\n${ativos.join("\n")}` : "Nenhum mandado ativo");
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

    const valor = Number(args[1]);
    if (isNaN(valor)) return message.reply("❌ Valor inválido");

    const imposto = valor * IMPOSTO_MULTA;
    multas[user.id] ??= [];
    multas[user.id].push({ valor, motivo: args.slice(2).join(" ") });

    economia[user.id].carteira -= valor;
    governo.caixa += imposto;

    save("./data/multas.json", multas);
    save("./data/economia.json", economia);
    save("./data/governo.json", governo);

    log(message.guild, "logs-economia", "💸 Multa aplicada", `Valor: ${valor}\nImposto: ${imposto}`, "Red");
    message.reply("🚔 Multa registrada");
  }

  // ================= JUDICIÁRIO =================
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

  if (cmd === "removercnh") {
    if (!hasCargo(message.member, CARGOS.JUIZ)) return;
    if (!user) return message.reply("❌ Marque um usuário");
    rgs[user.id].cnh = "Sem CNH";
    save("./data/rgs.json", rgs);
    message.reply("❌ CNH removida");
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

  // ================= EMPREGOS =================
  const EMPREGOS_DISPONIVEIS = [
    "Policia", "Bombeiro", "Medico", "Paramedico",
    "Caminhoneiro", "Lixeiro", "Transporte de Valores", 
    "Gerente de Banco", "Correio", "Jornal", "Construcao Civil"
  ];

  if (cmd === "emprego") {
    const escolha = args.join(" ");
    if (!EMPREGOS_DISPONIVEIS.includes(escolha)) return message.reply(`❌ Emprego inválido. Disponíveis: ${EMPREGOS_DISPONIVEIS.join(", ")}`);

    if (escolha === "Policia" && !hasCargo(message.member, CARGOS.POLICIA))
      return message.reply("❌ Você precisa do cargo Polícia");
    if (escolha === "Bombeiro" && !hasCargo(message.member, CARGOS.BOMBEIRO))
      return message.reply("❌ Você precisa do cargo Bombeiro");
    if (escolha === "Medico" && !hasCargo(message.member, CARGOS.MEDICO))
      return message.reply("❌ Você precisa do cargo Medico");
    if (escolha === "Paramedico" && !hasCargo(message.member, CARGOS.PARAMEDICO))
      return message.reply("❌ Você precisa do cargo Paramedico");

    empregos[message.author.id] = escolha;
    save("./data/empregos.json", empregos);
    message.reply(`✅ Você agora é ${escolha}`);
  }

  if (cmd === "trabalhar") {
    const emprego = empregos[message.author.id];
    if (!emprego) return message.reply("❌ Você ainda não possui um emprego. Use !emprego");

    let salario = 0;
    switch(emprego) {
      case "Policia": salario = 500; break;
      case "Bombeiro": salario = 400; break;
      case "Medico": salario = 450; break;
      case "Paramedico": salario = 350; break;
      case "Caminhoneiro": salario = 300; break;
      case "Lixeiro": salario = 250; break;
      case "Transporte de Valores": salario = 600; break;
      case "Gerente de Banco": salario = 700; break;
      case "Correio": salario = 300; break;
      case "Jornal": salario = 250; break;
      case "Construcao Civil": salario = 350; break;
      default: salario = 200;
    }

    economia[message.author.id].carteira += salario;
    save("./data/economia.json", economia);
    message.reply(`💼 Você trabalhou como ${emprego} e ganhou ${salario}`);
  }

  // ================= AJUDA =================
  if (cmd === "ajuda") {
    message.reply(`
🪪 RG: !setrg !rg
💰 Economia: !saldo !depositar !sacar !transferir !trabalhar !emprego
🚔 Polícia: !addmandado !removermandado !mandadosativos !multar !consultar
⚖️ Judiciário: !abrirprocesso !encerrarprocesso !suspendercnh !removercnh !cassarcnh !regularcnh !invalidarrg !regularizarrg
🏛 Governo: !sitio !orcamento !addlei !removerlei !leis !addcaixa !retirarcaixa !setimposto
    `);
  }
});

client.login(process.env.TOKEN);
