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
const LOG_CHANNEL = "logs-rp";

/* ===== Arquivos ===== */
const FILES = {
  rgs: "./rgs.json",
  economia: "./economia.json",
  antecedentes: "./antecedentes.json",
  mandados: "./mandados.json",
  veiculos: "./veiculos.json"
};

/* ===== Inicializa arquivos ===== */
for (const f of Object.values(FILES)) {
  if (!fs.existsSync(f)) fs.writeFileSync(f, "{}");
}

/* ===== Cargos ===== */
const POLICIA = ["Policia Civil","Policia Militar","Policia Federal","PRF","Policia do Exército"];
const STAFF = ["Fundador","Gerente de Comunidade","Administrador","Monitor"];
const CONSULTA = [...STAFF,"Moderador"];

/* ===== Utilidades ===== */
const load = f => {
  if(!fs.existsSync(f)) fs.writeFileSync(f,"{}");
  const data = fs.readFileSync(f,"utf-8");
  if(!data) fs.writeFileSync(f,"{}");
  return JSON.parse(fs.readFileSync(f,"utf-8"));
};
const save = (f,d) => fs.writeFileSync(f, JSON.stringify(d,null,2));
const hasRole = (m,roles) => m.roles.cache.some(r => roles.includes(r.name));
const gerar19 = () => Array.from({length:19},()=>Math.floor(Math.random()*10)).join("");
const idade = n => {
  const [d,m,a] = n.split("/").map(Number);
  const h = new Date();
  let i = h.getFullYear() - a;
  if(h.getMonth()+1 < m || (h.getMonth()+1===m && h.getDate()<d)) i--;
  return i;
};
const formatDate = d => new Date(d).toLocaleDateString();

/* ===== LOG EMBED ===== */
async function logEmbed(guild,categoria,descricao){
  const canal = guild.channels.cache.find(c=>c.name===LOG_CHANNEL);
  if(!canal) return;
  let cor,titulo;
  switch(categoria){
    case "RG": cor="#1f2c34"; titulo="🪪 RG"; break;
    case "POLICIA": cor="#ff0000"; titulo="🚓 Polícia"; break;
    case "ECONOMIA": cor="#00ff00"; titulo="💰 Economia"; break;
    case "JUDICIARIO": cor="#ff9900"; titulo="⚖️ Judiciário"; break;
    case "VEICULO": cor="#0099ff"; titulo="🚗 Veículos"; break;
    default: cor="#ffffff"; titulo="LOG";
  }
  const embed = new EmbedBuilder()
    .setTitle(titulo)
    .setDescription(descricao)
    .setColor(cor)
    .setTimestamp();
  canal.send({embeds:[embed]});
}

/* ===== Prisões ativas ===== */
const prisaoAtiva = {};

/* ===== BOT ONLINE ===== */
client.once("ready",()=>console.log(`✅ Bot online como ${client.user.tag}`));

/* ===== EVENTO DE MENSAGEM ===== */
client.on("messageCreate", async message => {
  if(message.author.bot||!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  const rgs = load(FILES.rgs);
  const eco = load(FILES.economia);
  const ant = load(FILES.antecedentes);
  const man = load(FILES.mandados);
  const veic = load(FILES.veiculos);

  /* ===== AJUDA ===== */
  if(cmd==="ajuda"){
    const e = new EmbedBuilder()
      .setTitle("📜 Comandos RP")
      .setColor("#1f2c34")
      .setDescription(`
🪪 **RG**
!setrg Nome Completo Estado Civil DD/MM/AAAA Gênero
!rg
!consultar @user

🚓 **Polícia**
!prender @user tempo(min) motivo
!soltar @user
!antecedentes @user
!cassarcnh @user

💰 **Economia**
!saldo
!pagar @user valor
!multar @user valor

⚖️ **Judiciário**
!mandado @user motivo
!removermandado @user
!mandadosativos

🚗 **Veículos**
!registrarplaca PLACA MODELO
!buscarplaca PLACA
      `);
    return message.author.send({embeds:[e]});
  }

  /* ===== RG ===== */
  if(cmd==="setrg"){
    if(rgs[message.author.id]) return message.reply("❌ Já possui RG.");
    if(args.length < 4) return message.reply("❌ Use: `!setrg Nome Completo Estado Civil DD/MM/AAAA Gênero`");

    const genero = args.pop();
    const nascimento = args.pop();
    const estadoCivil = args.pop();
    const nome = args.join(" ");

    const id = idade(nascimento);
    if(id<0||id>120) return message.reply("❌ Data de nascimento inválida.");

    rgs[message.author.id] = {
      rg: gerar19(),
      nome,
      estado: estadoCivil,
      nasc: nascimento,
      genero,
      idade: id,
      validade: Date.now() + 31536000000
    };
    save(FILES.rgs,rgs);

    const embed = new EmbedBuilder()
      .setTitle("🪪 RG Criado")
      .setColor("#1f2c34")
      .setDescription("━━━━━━━━━━━━━━━━━━━━")
      .addFields(
        { name:"Nome", value:nome, inline:true },
        { name:"RG", value:rgs[message.author.id].rg, inline:true },
        { name:"Validade", value:formatDate(rgs[message.author.id].validade), inline:true }
      )
      .setFooter({text:"Documento RP válido"});

    message.reply({embeds:[embed]});
    logEmbed(message.guild,"RG",`🆕 RG criado por ${message.author.tag} (${nome})`);
  }

  if(cmd==="rg"){
    const rg = rgs[message.author.id];
    if(!rg) return message.reply("❌ Sem RG.");
    const cor = Date.now() < rg.validade ? "#1f2c34" : "#ff0000";
    const status = Date.now() < rg.validade ? "Válido" : "Expirado";
    const e = new EmbedBuilder()
      .setTitle("🪪 Carteira de Identidade")
      .setColor(cor)
      .setDescription("━━━━━━━━━━━━━━━━━━━━")
      .addFields(
        { name:"Nome", value:rg.nome },
        { name:"RG", value:rg.rg },
        { name:"Idade", value:`${rg.idade}` },
        { name:"Gênero", value:rg.genero },
        { name:"Status", value:status },
        { name:"Validade", value:formatDate(rg.validade) }
      )
      .setFooter({text:"Documento RP válido"});
    return message.reply({embeds:[e]});
  }

  if(cmd==="consultar"){
    if(!hasRole(message.member,CONSULTA)) return message.reply("❌ Sem permissão.");
    const u = message.mentions.users.first();
    if(!u) return message.reply("❌ Mencione o usuário.");
    const rg = rgs[u.id];
    if(!rg) return message.reply("❌ Usuário sem RG.");
    const cor = Date.now() < rg.validade ? "#1f2c34" : "#ff0000";
    const status = Date.now() < rg.validade ? "Válido" : "Expirado";
    const e = new EmbedBuilder()
      .setTitle(`🪪 RG de ${u.tag}`)
      .setColor(cor)
      .setDescription("━━━━━━━━━━━━━━━━━━━━")
      .addFields(
        { name:"Nome", value:rg.nome },
        { name:"RG", value:rg.rg },
        { name:"Idade", value:`${rg.idade}` },
        { name:"Gênero", value:rg.genero },
        { name:"Status", value:status },
        { name:"Validade", value:formatDate(rg.validade) }
      )
      .setFooter({text:"Consulta RP"});
    return message.reply({embeds:[e]});
  }

  /* ===== POLÍCIA ===== */
  if(cmd==="prender"){
    if(!hasRole(message.member,POLICIA)) return message.reply("❌ Sem permissão.");
    const u = message.mentions.members.first();
    if(!u) return message.reply("❌ Mencione o usuário.");
    const tempo = parseInt(args[1]);
    const motivo = args.slice(2).join(" ") || "Não informado";
    prisaoAtiva[u.id] = Date.now() + tempo*60000;
    logEmbed(message.guild,"POLICIA",`🚨 ${u.user.tag} preso por ${message.author.tag} (${motivo})`);
    message.reply(`✅ ${u.user.tag} preso por ${tempo} minutos.`);
  }

  if(cmd==="soltar"){
    if(!hasRole(message.member,POLICIA)) return message.reply("❌ Sem permissão.");
    const u = message.mentions.members.first();
    if(!u) return message.reply("❌ Mencione o usuário.");
    if(!prisaoAtiva[u.id]) return message.reply("❌ Usuário não está preso.");
    delete prisaoAtiva[u.id];
    logEmbed(message.guild,"POLICIA",`✅ ${u.user.tag} solto por ${message.author.tag}`);
    message.reply(`✅ ${u.user.tag} foi solto.`);
  }

  if(cmd==="antecedentes"){
    if(!hasRole(message.member,POLICIA)) return message.reply("❌ Sem permissão.");
    const u = message.mentions.users.first();
    if(!u) return message.reply("❌ Mencione o usuário.");
    const lista = ant[u.id]||[];
    const e = new EmbedBuilder()
      .setTitle(`📜 Antecedentes de ${u.tag}`)
      .setColor("#ff0000")
      .setDescription(lista.length>0 ? lista.join("\n") : "Sem antecedentes");
    message.reply({embeds:[e]});
  }

  if(cmd==="cassarcnh"){
    if(!hasRole(message.member,POLICIA)) return message.reply("❌ Sem permissão.");
    const u = message.mentions.users.first();
    if(!u) return message.reply("❌ Mencione o usuário.");
    if(!rgs[u.id]) return message.reply("❌ Usuário não possui RG.");
    rgs[u.id].validade = 0;
    save(FILES.rgs,rgs);
    logEmbed(message.guild,"POLICIA",`🚫 CNH de ${u.tag} cassada por ${message.author.tag}`);
    message.reply(`✅ CNH de ${u.tag} cassada.`);
  }

  /* ===== ECONOMIA ===== */
  if(cmd==="saldo"){
    if(!eco[message.author.id]) eco[message.author.id]=0;
    save(FILES.economia,eco);
    message.reply(`💰 Seu saldo: R$${eco[message.author.id]}`);
  }

  if(cmd==="pagar"){
    const u = message.mentions.users.first();
    if(!u) return message.reply("❌ Mencione o usuário.");
    const valor = parseInt(args[1]);
    if(isNaN(valor)||valor<=0) return message.reply("❌ Valor inválido.");
    if(!eco[message.author.id]||eco[message.author.id]<valor) return message.reply("❌ Saldo insuficiente.");
    eco[message.author.id]-=valor;
    if(!eco[u.id]) eco[u.id]=0;
    eco[u.id]+=valor;
    save(FILES.economia,eco);
    message.reply(`✅ Transferido R$${valor} para ${u.tag}`);
    logEmbed(message.guild,"ECONOMIA",`💸 ${message.author.tag} pagou R$${valor} para ${u.tag}`);
  }

  if(cmd==="multar"){
    if(!hasRole(message.member,POLICIA)) return message.reply("❌ Sem permissão.");
    const u = message.mentions.users.first();
    const valor = parseInt(args[1]);
    if(!u||isNaN(valor)||valor<=0) return message.reply("❌ Dados inválidos.");
    if(!eco[u.id]) eco[u.id]=0;
    eco[u.id]-=valor;
    if(!eco[message.author.id]) eco[message.author.id]=0;
    eco[message.author.id]+=valor;
    save(FILES.economia,eco);
    message.reply(`✅ ${u.tag} multado em R$${valor}`);
    logEmbed(message.guild,"ECONOMIA",`💸 ${u.tag} multado em R$${valor} por ${message.author.tag}`);
  }

  /* ===== JUDICIÁRIO ===== */
  if(cmd==="mandado"){
    if(!hasRole(message.member,STAFF)) return message.reply("❌ Sem permissão.");
    const u = message.mentions.users.first();
    if(!u) return message.reply("❌ Mencione o usuário.");
    const motivo = args.slice(1).join(" ") || "Não informado";
    man[u.id] = motivo;
    save(FILES.mandados,man);
    logEmbed(message.guild,"JUDICIARIO",`⚖️ Mandado contra ${u.tag} adicionado por ${message.author.tag} (${motivo})`);
    message.reply(`✅ Mandado adicionado contra ${u.tag}`);
  }

  if(cmd==="removermandado"){
    if(!hasRole(message.member,STAFF)) return message.reply("❌ Sem permissão.");
    const u = message.mentions.users.first();
    if(!u) return message.reply("❌ Mencione o usuário.");
    delete man[u.id];
    save(FILES.mandados,man);
    logEmbed(message.guild,"JUDICIARIO",`⚖️ Mandado contra ${u.tag} removido por ${message.author.tag}`);
    message.reply(`✅ Mandado removido de ${u.tag}`);
  }

  if(cmd==="mandadosativos"){
    const list = Object.entries(man).map(([id,m])=>`<@${id}> - ${m}`);
    const e = new EmbedBuilder()
      .setTitle("⚖️ Mandados Ativos")
      .setColor("#ff9900")
      .setDescription(list.length>0 ? list.join("\n") : "Nenhum mandado ativo");
    message.reply({embeds:[e]});
  }

  /* ===== VEÍCULOS ===== */
  if(cmd==="registrarplaca"){
    if(!hasRole(message.member,POLICIA)) return message.reply("❌ Sem permissão.");
    const placa = args[0];
    const modelo = args.slice(1).join(" ");
    if(!placa||!modelo) return message.reply("❌ Uso: !registrarplaca PLACA MODELO");
    veic[placa] = {modelo,registradoPor:message.author.id};
    save(FILES.veiculos,veic);
    message.reply(`✅ Veículo ${modelo} registrado com a placa ${placa}`);
    logEmbed(message.guild,"VEICULO",`🚗 Placa ${placa} (${modelo}) registrada por ${message.author.tag}`);
  }

  if(cmd==="buscarplaca"){
    const placa = args[0];
    if(!placa) return message.reply("❌ Uso: !buscarplaca PLACA");
    const info = veic[placa];
    if(!info) return message.reply("❌ Placa não registrada");
    message.reply(`🚗 Placa ${placa} - Modelo: ${info.modelo}`);
  }

});

client.login(process.env.TOKEN);
