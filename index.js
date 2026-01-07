// =========================
// LAGUNA ROLEPLAY BOT
// Index.js completo
// =========================

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
  MEDICO: "Médico",
  PARAMEDICO: "Paramédico",
  GERENTE: "Gerente de Comunidade",
  MONITOR: "Monitor"
};

// ===== CONFIG =====
const IMPOSTO_MULTA = 0.1;

// ===== FUNÇÕES =====
function load(file){ if(!fs.existsSync(file)) fs.writeFileSync(file,"{}"); return JSON.parse(fs.readFileSync(file)); }
function save(file,data){ fs.writeFileSync(file,JSON.stringify(data,null,2)); }
function hasCargo(member,cargo){ return member.roles.cache.some(r=>r.name===cargo); }
function gerarCPF(){ const n=()=>Math.floor(Math.random()*10); return `${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}.${n()}${n()}`; }
function log(guild,canal,titulo,desc,cor="Blue"){ const c=guild.channels.cache.find(ch=>ch.name===canal); if(!c)return; const e=new EmbedBuilder().setTitle(titulo).setDescription(desc).setColor(cor).setTimestamp(); c.send({embeds:[e]}); }

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
client.once("ready",()=>console.log(`✅ Bot online: ${client.user.tag}`));

// ===== MESSAGE =====
client.on("messageCreate",async message=>{
  if(!message.content.startsWith(PREFIX)||message.author.bot) return;

  const args=message.content.slice(1).split(" ");
  const cmd=args.shift().toLowerCase();
  const user=message.mentions.users.first();

  economia[message.author.id]??={carteira:0,banco:0};
  governo.caixa??=0;
  empregos[message.author.id]??={cargo:null,ultimaData:0};

  // ================= RG =================
  if(cmd==="setrg"){
    const t=args.join(" ").split(";");
    if(t.length<4) return message.reply("Use: !setrg Nome;Estado Civil;DD/MM/AAAA;Gênero");
    const idade=new Date().getFullYear()-t[2].split("/")[2];
    rgs[message.author.id]={nome:t[0],estado:t[1],idade,genero:t[3],cpf:gerarCPF(),status:"Válido",validade:"23/07/2026",cnh:"Sem CNH"};
    economia[message.author.id].carteira+=1000; // bônus ao criar RG
    save("./data/rgs.json",rgs); save("./data/economia.json",economia);
    message.reply("🪪 RG criado com sucesso e R$1000 depositados na sua carteira");
  }

  // ================= ECONOMIA =================
  if(cmd==="saldo"){
    message.reply(`💰 Carteira: ${economia[message.author.id].carteira}\n🏦 Banco: ${economia[message.author.id].banco}`);
  }

  if(cmd==="addmoney"&&(hasCargo(message.member,CARGOS.FUNDADOR)||hasCargo(message.member,CARGOS.GERENTE)||hasCargo(message.member,CARGOS.MONITOR))){
    if(!user||isNaN(Number(args[1]))) return message.reply("Use: !addmoney @user valor");
    economia[user.id].carteira+=Number(args[1]);
    save("./data/economia.json",economia);
    log(message.guild,"logs-economia","💰 Dinheiro adicionado",`${user.tag} recebeu R$${args[1]}`);
    message.reply(`💰 R$${args[1]} adicionado para ${user.tag}`);
  }

  if(cmd==="removermoney"&&(hasCargo(message.member,CARGOS.FUNDADOR)||hasCargo(message.member,CARGOS.GERENTE)||hasCargo(message.member,CARGOS.MONITOR))){
    if(!user||isNaN(Number(args[1]))) return message.reply("Use: !removermoney @user valor");
    economia[user.id].carteira-=Number(args[1]);
    save("./data/economia.json",economia);
    log(message.guild,"logs-economia","💸 Dinheiro removido",`${user.tag} perdeu R$${args[1]}`);
    message.reply(`💸 R$${args[1]} removido de ${user.tag}`);
  }

  if(cmd==="transferir"){
    const valor=Number(args[1]);
    if(!user||isNaN(valor)||valor<=0) return message.reply("Use: !transferir @user valor");
    if(economia[message.author.id].carteira<valor) return message.reply("❌ Saldo insuficiente");
    economia[message.author.id].carteira-=valor;
    economia[user.id].carteira+=valor;
    save("./data/economia.json",economia);
    message.reply(`💸 Transferido R$${valor} para ${user.tag}`);
  }

  if(cmd==="top10"){
    const top=Object.entries(economia).sort((a,b)=>b[1].carteira+b[1].banco-(a[1].carteira+a[1].banco)).slice(0,10);
    message.reply("💰 **Top 10 Mais Ricos:**\n"+top.map(([id,eco],i)=>`${i+1}. <@${id}>: R$${eco.carteira+eco.banco}`).join("\n"));
  }

  // ================= POLÍCIA =================
  if(cmd==="addmandado"){
    if(!hasCargo(message.member,CARGOS.POLICIA)) return message.reply("❌ Sem permissão");
    mandados[user.id]={motivo:args.slice(1).join(" "),ativo:true};
    save("./data/mandados.json",mandados);
    log(message.guild,"logs-policia","🚔 Mandado emitido",user.tag,"Red");
    message.reply("🚨 Mandado criado");
  }

  if(cmd==="removermandado"){
    if(!hasCargo(message.member,CARGOS.POLICIA)) return message.reply("❌ Sem permissão");
    delete mandados[user.id]; save("./data/mandados.json",mandados);
    message.reply("✅ Mandado removido");
  }

  if(cmd==="mandadosativos"){
    if(!hasCargo(message.member,CARGOS.POLICIA)) return message.reply("❌ Sem permissão");
    const ativos=Object.entries(mandados).filter(([k,v])=>v.ativo).map(([k,v])=>`<@${k}>: ${v.motivo}`);
    message.reply("🚨 **Mandados Ativos:**\n"+(ativos.length>0?ativos.join("\n"):"Nenhum"));
  }

  if(cmd==="consultar"){
    if(!hasCargo(message.member,CARGOS.POLICIA)&&!hasCargo(message.member,CARGOS.JUIZ)) return message.reply("❌ Sem permissão");
    let rgUsuario;
    if(user) rgUsuario=rgs[user.id];
    else if(args[0]) rgUsuario=Object.values(rgs).find(r=>r.cpf===args[0]||r.id===args[0]);
    if(!rgUsuario) return message.reply("❌ RG não encontrado");
    const emb=new EmbedBuilder()
      .setTitle("🪪 Carteira de Identidade")
      .setColor("Blue")
      .setDescription(`👤 Nome: ${rgUsuario.nome}\n🆔 RG: ${rgUsuario.id||"N/A"}\n💍 Estado Civil: ${rgUsuario.estado}\n🎂 Idade: ${rgUsuario.idade}\n📄 CPF: ${rgUsuario.cpf}\n⚧ Gênero: ${rgUsuario.genero}\n🚔 CNH: ${rgUsuario.cnh}\n📋 Antecedentes: ${antecedentes[user?.id||message.author.id]?.length||"Nenhum"}\n✅ Status: ${rgUsuario.status}`);
    message.channel.send({embeds:[emb]});
  }

  // ================= JUDICIÁRIO =================
  if(cmd==="abrirprocesso"){
    if(!hasCargo(message.member,CARGOS.JUIZ)) return message.reply("❌ Sem permissão");
    processos[user.id]={juiz:message.author.tag,status:"Aberto"};
    save("./data/processos.json",processos);
    log(message.guild,"logs-judiciario","⚖️ Processo aberto",user.tag);
  }

  if(cmd==="encerrarprocesso"){
    if(!hasCargo(message.member,CARGOS.JUIZ)) return message.reply("❌ Sem permissão");
    processos[user.id].status="Encerrado"; save("./data/processos.json",processos);
    message.reply("⚖️ Processo encerrado");
  }

  if(cmd==="suspendercnh"){
    if(!hasCargo(message.member,CARGOS.JUIZ)) return message.reply("❌ Sem permissão");
    rgs[user.id].cnh="Suspensa"; save("./data/rgs.json",rgs);
    message.reply("🚫 CNH suspensa");
  }

  if(cmd==="cassarcnh"){
    if(!hasCargo(message.member,CARGOS.JUIZ)) return message.reply("❌ Sem permissão");
    rgs[user.id].cnh="Cassada"; save("./data/rgs.json",rgs);
    message.reply("🚫 CNH cassada");
  }

  if(cmd==="regularcnh"){
    if(!hasCargo(message.member,CARGOS.JUIZ)) return message.reply("❌ Sem permissão");
    rgs[user.id].cnh="Regular"; save("./data/rgs.json",rgs);
    message.reply("✅ CNH regularizada");
  }

  if(cmd==="invalidarrg"){
    if(!hasCargo(message.member,CARGOS.JUIZ)) return message.reply("❌ Sem permissão");
    rgs[user.id].status="Inválido"; save("./data/rgs.json",rgs);
    message.reply("❌ RG invalidado");
  }

  if(cmd==="regularizarrg"){
    if(!hasCargo(message.member,CARGOS.JUIZ)) return message.reply("❌ Sem permissão");
    rgs[user.id].status="Válido"; save("./data/rgs.json",rgs);
    message.reply("✅ RG regularizado");
  }

  // ================= CNH =================
  if(cmd==="tirarcnh"){
    if(!rgs[message.author.id]) return message.reply("❌ Você precisa de um RG");
    if(economia[message.author.id].carteira<3500) return message.reply("❌ R$3500 necessários para tirar CNH");
    economia[message.author.id].carteira-=3500;
    rgs[message.author.id].cnh="Regular";
    save("./data/rgs.json",rgs); save("./data/economia.json",economia);
    message.reply("🚗 CNH adquirida com sucesso!");
  }

  if(cmd==="setcnh"){
    if(!(hasCargo(message.member,CARGOS.FUNDADOR)||hasCargo(message.member,CARGOS.GERENTE)||hasCargo(message.member,CARGOS.MONITOR))) return message.reply("❌ Sem permissão");
    rgs[user.id].cnh=args[0]||rgs[user.id].cnh; save("./data/rgs.json",rgs);
    message.reply(`🚗 CNH de ${user.tag} alterada para ${rgs[user.id].cnh}`);
  }

  // ================= EMPREGOS =================
  if(cmd==="emprego"){
    const listaEmp=["Polícia","Bombeiro","Médico","Paramédico","Transporte de Valores","Gerente de Banco","Correio","Jornal","Construção Civil"];
    if(!args[0]||!listaEmp.includes(args[0])) return message.reply("❌ Emprego inválido");
    empregos[message.author.id].cargo=args[0]; save("./data/empregos.json",empregos);
    message.reply(`✅ Emprego definido: ${args[0]}`);
  }

  if(cmd==="trabalhar"){
    const hoje= new Date().toDateString();
    if(empregos[message.author.id].ultimaData===hoje) return message.reply("❌ Você só pode trabalhar 1 vez por dia");
    const salario={Polícia:1000,Bombeiro:900,Médico:1200,Paramédico:1100,"Transporte de Valores":1300,"Gerente de Banco":1500,Correio:800,Jornal:700,"Construção Civil":900};
    const cargoAtual=empregos[message.author.id].cargo;
    if(!cargoAtual) return message.reply("❌ Você precisa escolher um emprego com !emprego");
    economia[message.author.id].carteira+=salario[cargoAtual]||500;
    empregos[message.author.id].ultimaData=hoje;
    save("./data/economia.json",economia); save("./data/empregos.json",empregos);
    message.reply(`💼 Você trabalhou como ${cargoAtual} e recebeu R$${salario[cargoAtual]||500}`);
  }

  if(cmd==="trocaremprego"){
    empregos[message.author.id].cargo=null; save("./data/empregos.json",empregos);
    message.reply("✅ Agora use !emprego para escolher novo emprego");
  }

  if(cmd==="sairemprego"){
    if(!(hasCargo(message.member,CARGOS.FUNDADOR)||hasCargo(message.member,CARGOS.GERENTE)||hasCargo(message.member,CARGOS.MONITOR))) return message.reply("❌ Sem permissão");
    empregos[user.id].cargo=null; save("./data/empregos.json",empregos);
    message.reply(`✅ ${user.tag} saiu do emprego`);
  }

  // ================= AJUDA =================
  if(cmd==="ajuda"){
    message.reply(`
🪪 **RG:** !setrg, !rg
💰 **Economia:** !saldo, !transferir, !top10, !addmoney*, !removermoney*
🚔 **Polícia:** !consultar, !addmandado, !removermandado, !mandadosativos
⚖️ **Judiciário:** !abrirprocesso, !encerrarprocesso, !suspendercnh, !cassarcnh, !regularcnh, !invalidarrg, !regularizarrg
🚗 **CNH:** !tirarcnh, !setcnh*
💼 **Empregos:** !emprego, !trabalhar, !trocaremprego, !sairemprego*
🏛 **Governo:** !sitio, !orcamento, !addcaixa, !retirarcaixa, !addlei, !removerlei, !leis, !setimposto, !iniciareleicao, !votar, !finalizareleicao

*Comando restrito a cargos específicos (Staff/Fundador)
`);
  }

});

// ===== LOGIN =====
client.login(process.env.TOKEN);
