const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const PREFIX = "!";

// ===== CARGOS =====
const CARGOS = {
  POLICIA: "Polícia",
  JUIZ: "Juiz",
  GOVERNADOR: "Governador",
  FUNDADOR: "Fundador",
  GERENTE: "Gerente de Comunidade",
  MONITOR: "Monitor",
  ADMIN: "Administrador",
  MOD: "Moderador",
  BOMBEIRO: "Bombeiro Militar",
  PARAMEDICO: "Paramedico",
  MEDICO: "Medico",
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
function hasCargo(member, ...cargos) {
  return cargos.some(cargo => member.roles.cache.some(r => r.name === cargo));
}
function gerarCPF() {
  const n = () => Math.floor(Math.random() * 10);
  return `${n()}${n()}${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}-${n()}${n()}`;
}
function log(guild, canal, titulo, desc, cor = "Blue") {
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
let empregos = load("./data/empregos.json");
let adv = load("./data/advertencias.json");
let veiculos = load("./data/veiculos.json");
let governo = load("./data/governo.json");
let cnhs = load("./data/cnhs.json");

// ===== READY =====
client.once("ready", () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
});

// ===== COMANDOS =====
client.on("messageCreate", async (message) => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(1).split(" ");
  const cmd = args.shift().toLowerCase();
  const user = message.mentions.users.first() || message.guild.members.cache.get(args[0])?.user;

  economia[message.author.id] ??= { carteira: 0, banco: 0 };
  governo.caixa ??= 0;

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
      cnh: "Sem CNH",
    };
    economia[message.author.id].carteira += 1000; // depósito inicial
    save("./data/rgs.json", rgs);
    save("./data/economia.json", economia);
    message.reply("🪪 RG criado e R$1000 depositados na carteira!");
  }

  if (cmd === "consultar") {
    if (!user) return message.reply("❌ Usuário não encontrado");
    if (
      !hasCargo(message.member, CARGOS.FUNDADOR, CARGOS.GERENTE, CARGOS.MONITOR, CARGOS.ADMIN, CARGOS.MOD, CARGOS.POLICIA, CARGOS.JUIZ)
    )
      return message.reply("❌ Sem permissão");

    // Consulta por ID, RG ou CPF
    let alvo = rgs[user.id];
    if (!alvo) {
      // procura por CPF
      alvo = Object.values(rgs).find((r) => r.cpf === args[0]);
      if (!alvo) return message.reply("❌ RG não encontrado");
    }

    const emb = new EmbedBuilder()
      .setTitle("🪪 Carteira de Identidade")
      .setColor("Blue")
      .setDescription(
        `👤 Nome: ${alvo.nome}\n🆔 RG: ${user.id}\n💍 Estado Civil: ${alvo.estado}\n🎂 Idade: ${alvo.idade}\n📄 CPF: ${alvo.cpf}\n⚧ Gênero: ${alvo.genero}\n🚔 CNH: ${alvo.cnh}\n📋 Antecedentes: ${antecedentes[user.id]?.length || "Nenhum"}\n✅ Status: ${alvo.status}`
      );
    message.channel.send({ embeds: [emb] });
  }

  // ===== ECONOMIA =====
  if (cmd === "saldo") {
    message.reply(
      `💰 Carteira: ${economia[message.author.id].carteira}\n🏦 Banco: ${economia[message.author.id].banco}`
    );
  }

  if (cmd === "addmoney") {
    if (!hasCargo(message.member, CARGOS.FUNDADOR, CARGOS.GERENTE, CARGOS.MONITOR))
      return message.reply("❌ Sem permissão");
    economia[user.id].carteira += Number(args[1]);
    save("./data/economia.json", economia);
    log(message.guild, "logs-economia", "💰 Dinheiro adicionado", `${user.tag}`);
  }

  if (cmd === "removermoney") {
    if (!hasCargo(message.member, CARGOS.FUNDADOR, CARGOS.GERENTE, CARGOS.MONITOR))
      return message.reply("❌ Sem permissão");
    economia[user.id].carteira -= Number(args[1]);
    save("./data/economia.json", economia);
    log(message.guild, "logs-economia", "💸 Dinheiro removido", `${user.tag}`);
  }

  if (cmd === "transferir") {
    const valor = Number(args[1]);
    if (economia[message.author.id].carteira < valor) return message.reply("❌ Saldo insuficiente");
    economia[message.author.id].carteira -= valor;
    economia[user.id].carteira += valor;
    save("./data/economia.json", economia);
    message.reply(`💸 Transferido R$${valor} para ${user.tag}`);
  }

  if (cmd === "top10") {
    const sorted = Object.entries(economia)
      .sort(([, a], [, b]) => b.carteira - a.carteira)
      .slice(0, 10)
      .map(([id, e], i) => `${i + 1}. <@${id}> - R$${e.carteira}`);
    message.reply(`🏆 Top 10 mais ricos:\n${sorted.join("\n")}`);
  }

  // ===== CNH =====
  if (cmd === "tirarcnh") {
    const categoria = args[0]?.toUpperCase();
    if (!categoria || !["B", "C"].includes(categoria)) return message.reply("Use: !tirarcnh B ou C");
    const preco = categoria === "B" ? 5000 : 7000;
    if (economia[message.author.id].carteira < preco) return message.reply("❌ Saldo insuficiente");

    economia[message.author.id].carteira -= preco;
    // Perguntas da prova
    const perguntas = [
      { q: "Qual o limite de velocidade em área urbana?", a: "50" },
      { q: "Qual a cor da placa de veículo particular?", a: "branca" },
      { q: "O que significa sinal vermelho?", a: "pare" },
      { q: "Qual a distância mínima de segurança?", a: "2" },
      { q: "Qual a prioridade em cruzamento?", a: "pedestre" },
      { q: "Pode estacionar em faixa amarela?", a: "não" },
    ];
    let acertos = 0;
    for (let i = 0; i < perguntas.length; i++) {
      // Simulação: aqui você pode implementar real prompt ou quiz
      if (Math.random() > 0.4) acertos++; // 60% chance de acertar
    }
    if (acertos >= 4) {
      cnhs[message.author.id] = { categoria, validade: Date.now() + 30 * 24 * 60 * 60 * 1000 }; // 30 dias
      rgs[message.author.id].cnh = categoria;
      save("./data/cnhs.json", cnhs);
      save("./data/rgs.json", rgs);
      save("./data/economia.json", economia);
      message.reply(`✅ Parabéns! CNH categoria ${categoria} aprovada.`);
    } else {
      message.reply("❌ Você reprovou na prova. Tente novamente pagando novamente.");
    }
  }

  if (cmd === "renovarcnh") {
    if (!cnhs[message.author.id]) return message.reply("❌ Você não possui CNH");
    const preco = 2000;
    if (economia[message.author.id].carteira < preco) return message.reply("❌ Saldo insuficiente");
    economia[message.author.id].carteira -= preco;
    cnhs[message.author.id].validade = Date.now() + 30 * 24 * 60 * 60 * 1000;
    save("./data/economia.json", economia);
    save("./data/cnhs.json", cnhs);
    message.reply("✅ CNH renovada com sucesso!");
  }

  if (cmd === "setcnh") {
    if (!hasCargo(message.member, ...Object.values(CARGOS))) return message.reply("❌ Apenas staffs podem usar");
    const cat = args[1]?.toUpperCase();
    if (!user || !["B", "C"].includes(cat)) return message.reply("Use: !setcnh @usuario B/C");
    rgs[user.id].cnh = cat;
    save("./data/rgs.json", rgs);
    message.reply(`✅ CNH de ${user.tag} definida como ${cat}`);
  }

  // ===== JUDICIÁRIO =====
  if (cmd === "abrirprocesso") {
    if (!hasCargo(message.member, CARGOS.JUIZ)) return;
    processos[user.id] = { juiz: message.author.tag, status: "Aberto" };
    save("./data/processos.json", processos);
    log(message.guild, "logs-judiciario", "⚖️ Processo aberto", user.tag);
  }

  if (cmd === "encerrarprocesso") {
    if (!hasCargo(message.member, CARGOS.JUIZ)) return;
    processos[user.id].status = "Encerrado";
    save("./data/processos.json", processos);
    message.reply("⚖️ Processo encerrado");
  }

  if (cmd === "cassarcnh") {
    if (!hasCargo(message.member, CARGOS.JUIZ)) return;
    rgs[user.id].cnh = "Cassada";
    save("./data/rgs.json", rgs);
    message.reply("🚫 CNH cassada");
  }

  if (cmd === "regularcnh") {
    if (!hasCargo(message.member, CARGOS.JUIZ)) return;
    rgs[user.id].cnh = cnhs[user.id]?.categoria || "Sem CNH";
    save("./data/rgs.json", rgs);
    message.reply("✅ CNH regularizada");
  }

  if (cmd === "invalidarrg") {
    if (!hasCargo(message.member, CARGOS.JUIZ)) return;
    rgs[user.id].status = "Inválido";
    save("./data/rgs.json", rgs);
  }

  if (cmd === "regularizarrg") {
    if (!hasCargo(message.member, CARGOS.JUIZ)) return;
    rgs[user.id].status = "Válido";
    save("./data/rgs.json", rgs);
  }

  // ===== POLÍCIA =====
  if (cmd === "addmandado") {
    if (!hasCargo(message.member, CARGOS.POLICIA)) return;
    mandados[user.id] = { motivo: args.slice(1).join(" "), ativo: true };
    save("./data/mandados.json", mandados);
    log(message.guild, "logs-policia", "🚔 Mandado emitido", user.tag, "Red");
    message.reply("🚨 Mandado criado");
  }

  if (cmd === "removermandado") {
    if (!hasCargo(message.member, CARGOS.POLICIA)) return;
    delete mandados[user.id];
    save("./data/mandados.json", mandados);
    message.reply("✅ Mandado removido");
  }

  if (cmd === "mandadosativos") {
    if (!hasCargo(message.member, CARGOS.POLICIA)) return;
    const ativos = Object.entries(mandados).filter(([, m]) => m.ativo).map(([id, m]) => `<@${id}> - ${m.motivo}`);
    message.reply(`🚨 Mandados ativos:\n${ativos.join("\n") || "Nenhum"}`);
  }

  if (cmd === "multar") {
    if (!hasCargo(message.member, CARGOS.POLICIA)) return;
    const valor = Number(args[1]);
    const imposto = valor * IMPOSTO_MULTA;
    multas[user.id] ??= [];
    multas[user.id].push({ valor, motivo: args.slice(2).join(" "), prazo: Date.now() + 2 * 24 * 60 * 60 * 1000, pago: false });
    economia[user.id].carteira -= valor;
    governo.caixa += imposto;
    save("./data/multas.json", multas);
    save("./data/economia.json", economia);
    save("./data/governo.json", governo);
    message.reply("🚔 Multa registrada");
  }

  if (cmd === "vermultar") {
    if (!hasCargo(message.member, CARGOS.FUNDADOR, CARGOS.GERENTE, CARGOS.MONITOR, CARGOS.POLICIA)) return;
    const lista = Object.entries(multas).map(([id, m]) => `<@${id}> - ${m.map(mm => mm.motivo).join(", ")}`);
    message.reply(`💰 Multas:\n${lista.join("\n") || "Nenhuma"}`);
  }

  if (cmd === "retirarmulta") {
    if (!hasCargo(message.member, CARGOS.FUNDADOR, CARGOS.GERENTE, CARGOS.MONITOR, CARGOS.POLICIA)) return;
    delete multas[user.id];
    save("./data/multas.json", multas);
    message.reply("✅ Multa removida");
  }

  if (cmd === "pagarmulta") {
    const lista = multas[message.author.id];
    if (!lista) return message.reply("❌ Você não possui multas");
    let total = lista.reduce((acc, m) => acc + m.valor, 0);
    if (economia[message.author.id].carteira < total) return message.reply("❌ Saldo insuficiente");
    economia[message.author.id].carteira -= total;
    lista.forEach(m => m.pago = true);
    save("./data/multas.json", multas);
    save("./data/economia.json", economia);
    message.reply(`✅ Multas pagas: R$${total}`);
  }

  // ===== EMPREGOS =====
  if (cmd === "emprego") {
    const job = args.join(" ").toLowerCase();
    const cargosValidos = {
      policia: CARGOS.POLICIA,
      bombeiro: CARGOS.BOMBEIRO,
      medico: CARGOS.MEDICO,
      paramedico: CARGOS.PARAMEDICO,
    };
    const jobsExtras = ["caminhoneiro","transporte","taxista","construcao","correios","fazendeiro","posto","lixeiro"];
    empregos[message.author.id] ??= { cargo: null, salario: 0, daily: false };

    if (empregos[message.author.id].cargo) return message.reply("❌ Você já possui um emprego. Use !trocaremprego para trocar.");

    if (cargosValidos[job]) {
      if (!hasCargo(message.member, cargosValidos[job])) return message.reply("❌ Você não possui o cargo necessário");
      empregos[message.author.id] = { cargo: job, salario: 1000, daily: false };
    } else if (jobsExtras.includes(job)) {
      let sal = 0;
      switch (job) {
        case "caminhoneiro": sal=780; break;
        case "transporte": sal=850; break;
        case "taxista": sal=600; break;
        case "construcao": sal=700; break;
        case "correios": sal=650; break;
        case "fazendeiro": sal=500; break;
        case "posto": sal=550; break;
        case "lixeiro": sal=500; break;
      }
      empregos[message.author.id] = { cargo: job, salario: sal, daily: false };
    } else return message.reply("❌ Emprego inválido");

    economia[message.author.id].carteira += empregos[message.author.id].salario;
    save("./data/empregos.json", empregos);
    save("./data/economia.json", economia);
    message.reply(`✅ Você começou a trabalhar como ${empregos[message.author.id].cargo} e recebeu R$${empregos[message.author.id].salario}`);
  }

  if (cmd === "sairemprego") {
    if (!hasCargo(message.member, CARGOS.FUNDADOR, CARGOS.GERENTE)) return message.reply("❌ Apenas staff pode remover do emprego");
   
