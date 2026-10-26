const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true } });
const PORT = process.env.PORT || 10000;
app.use(express.static(path.join(__dirname, 'public')));
app.get('/healthz', (_, res) => res.json({ ok: true, name: 'Fake Fact' }));

const prompts = [
{q:'A group of flamingos is called a…',a:'flamboyance',opts:['flamboyance','pink parade','feather fleet']},
{q:'Which animal has three hearts?',a:'Octopus',opts:['Octopus','Dolphin','Penguin']},
{q:'Bananas are botanically classified as…',a:'Berries',opts:['Berries','Nuts','Drupes']},
{q:'What is the national animal of Scotland?',a:'Unicorn',opts:['Unicorn','Lion','Golden eagle']},
{q:'Which planet rains diamonds according to scientific models?',a:'Neptune',opts:['Neptune','Mars','Mercury']},
{q:'A narwhal’s tusk is actually an enlarged…',a:'Tooth',opts:['Tooth','Horn','Bone']},
{q:'What is the dot over a lowercase i called?',a:'Tittle',opts:['Tittle','Jot','Nub']},
{q:'Which food can last for thousands of years when stored properly?',a:'Honey',opts:['Honey','Bread','Cheese']},
{q:'How many noses does a slug have?',a:'Four',opts:['Four','Two','Six']},
{q:'What is a baby puffin sometimes called?',a:'Puffling',opts:['Puffling','Pufflet','Fluffin']},
{q:'Which mammal is capable of true flight?',a:'Bat',opts:['Bat','Flying squirrel','Sugar glider']},
{q:'What colour is a polar bear’s skin beneath its fur?',a:'Black',opts:['Black','Pink','White']},
{q:'Which bird can fly backwards?',a:'Hummingbird',opts:['Hummingbird','Sparrow','Albatross']},
{q:'What is the fear of long words humorously called?',a:'Hippopotomonstrosesquipedaliophobia',opts:['Hippopotomonstrosesquipedaliophobia','Logophobia','Lexicophobia']},
{q:'Which sea creature has blue blood?',a:'Horseshoe crab',opts:['Horseshoe crab','Sea turtle','Clownfish']},
{q:'What is the only continent with no native ants?',a:'Antarctica',opts:['Antarctica','Europe','Australia']},
{q:'Which fruit has its seeds on the outside?',a:'Strawberry',opts:['Strawberry','Raspberry','Blackberry']},
{q:'A group of crows is often called a…',a:'Murder',opts:['Murder','Thunder','Parliament']},
{q:'Which animal’s fingerprints can resemble humans’?',a:'Koala',opts:['Koala','Panda','Lemur']},
{q:'What is the smallest bone in the human body?',a:'Stapes',opts:['Stapes','Patella','Incus']},
{q:'Which planet has the shortest day?',a:'Jupiter',opts:['Jupiter','Venus','Earth']},
{q:'What is the collective noun for owls?',a:'Parliament',opts:['Parliament','Wisdom','Council']},
{q:'Which animal cannot jump?',a:'Elephant',opts:['Elephant','Kangaroo','Rabbit']},
{q:'What is the hardest natural substance?',a:'Diamond',opts:['Diamond','Quartz','Granite']},
{q:'Which country gifted the Statue of Liberty to the United States?',a:'France',opts:['France','Italy','Spain']},
{q:'What is the main gas in Earth’s atmosphere?',a:'Nitrogen',opts:['Nitrogen','Oxygen','Carbon dioxide']},
{q:'Which metal is liquid at typical room temperature?',a:'Mercury',opts:['Mercury','Aluminium','Copper']},
{q:'What is the largest species of shark?',a:'Whale shark',opts:['Whale shark','Great white shark','Tiger shark']},
{q:'Which animal has rectangular pupils?',a:'Goat',opts:['Goat','Cat','Horse']},
{q:'What do bees collect that they turn into honey?',a:'Nectar',opts:['Nectar','Pollen only','Sap']},
{q:'Which country has a maple leaf on its flag?',a:'Canada',opts:['Canada','Austria','Denmark']},
{q:'How many sides does a dodecagon have?',a:'Twelve',opts:['Twelve','Ten','Fourteen']},
{q:'Which is the largest ocean on Earth?',a:'Pacific Ocean',opts:['Pacific Ocean','Atlantic Ocean','Indian Ocean']},
{q:'What is the name for a word that reads the same backwards?',a:'Palindrome',opts:['Palindrome','Anagram','Homonym']},
{q:'Which animal is known to sleep standing up?',a:'Horse',opts:['Horse','Otter','Badger']},
{q:'What is the fastest land animal?',a:'Cheetah',opts:['Cheetah','Pronghorn','Lion']},
{q:'Which vitamin can the body make with sunlight exposure?',a:'Vitamin D',opts:['Vitamin D','Vitamin C','Vitamin B12']},
{q:'What is the largest organ of the human body?',a:'Skin',opts:['Skin','Liver','Lungs']},
{q:'Which bird is famous for mimicking human speech?',a:'Parrot',opts:['Parrot','Eagle','Stork']},
{q:'What is the chemical symbol for gold?',a:'Au',opts:['Au','Ag','Go']}
];
const rooms = new Map();
const code = () => Math.random().toString(36).slice(2,6).toUpperCase();
const publicRoom = r => ({code:r.code,phase:r.phase,round:r.round,maxRounds:5,hostId:r.hostId,players:[...r.players.values()].map(p=>({id:p.id,name:p.name,score:p.score,connected:p.connected})),prompt:r.prompt?{q:r.prompt.q}:null,submissions:r.submissions.map(s=>({id:s.id,text:s.text,playerId:s.playerId})),choices:r.choices.map(c=>({id:c.id,text:c.text})),votes:r.votes,results:r.results});
function sendRoom(r){io.to(r.code).emit('room:update',publicRoom(r));}
function notice(s,msg){s.emit('notice',msg);}
function shuffle(a){return a.map(x=>[Math.random(),x]).sort((x,y)=>x[0]-y[0]).map(x=>x[1]);}
function beginRound(r){
 if(r.round>=5){r.phase='finished';r.results=[...r.players.values()].sort((a,b)=>b.score-a.score).map(p=>({name:p.name,score:p.score}));sendRoom(r);return;}
 r.round++; r.phase='submit'; r.prompt=prompts[(r.round-1)%prompts.length]; r.submissions=[];r.choices=[];r.votes={};r.results=null;
 clearTimeout(r.timer);r.timer=setTimeout(()=>startVote(r),30000);
 io.to(r.code).emit('round:prompt',{q:r.prompt.q,round:r.round,total:5,seconds:30});sendRoom(r);
}
function startVote(r){
 if(!r||r.phase!=='submit')return;
 for(const p of r.players.values()) if(p.connected && !r.submissions.some(s=>s.playerId===p.id)) r.submissions.push({id:'pass-'+p.id,text:'(passed)',playerId:p.id,pass:true});
 r.choices=shuffle([...r.submissions.filter(s=>!s.pass).map(s=>({id:s.id,text:s.text,playerId:s.playerId,real:false})),{id:'real-'+r.round,text:r.prompt.a,playerId:null,real:true}]);
 r.phase='vote';clearTimeout(r.timer);r.timer=setTimeout(()=>finishVote(r),20000);
 io.to(r.code).emit('vote:start',{seconds:20});sendRoom(r);
}
function finishVote(r){
 if(!r||r.phase!=='vote')return;
 clearTimeout(r.timer);
 for(const [voterId,choiceId] of Object.entries(r.votes)){
  const player=r.players.get(voterId),choice=r.choices.find(c=>c.id===choiceId);
  if(player&&choice&&choice.real)player.score+=2;
  if(choice&&!choice.real&&choice.playerId&&choice.playerId!==voterId){const author=r.players.get(choice.playerId);if(author)author.score+=1;}
 }
 r.phase='reveal';r.results=[...r.players.values()].map(p=>({id:p.id,name:p.name,score:p.score})).sort((a,b)=>b.score-a.score);
 io.to(r.code).emit('round:reveal',{answer:r.prompt.a,choices:r.choices.map(c=>({...c,author:c.playerId?r.players.get(c.playerId)?.name||'Disconnected player':null})),votes:r.votes,results:r.results,round:r.round});
 sendRoom(r);
}
io.on('connection',socket=>{
 socket.on('room:create',({name},cb=()=>{})=>{
  name=String(name||'').trim().slice(0,20);if(!name)return cb({error:'Enter a nickname.'});
  let c;do{c=code()}while(rooms.has(c));
  const r={code:c,hostId:socket.id,players:new Map(),phase:'lobby',round:0,prompt:null,submissions:[],choices:[],votes:{},results:null,timer:null};
  r.players.set(socket.id,{id:socket.id,name,score:0,connected:true,lastSeen:Date.now()});rooms.set(c,r);socket.join(c);socket.data.room=c;cb({code:c});sendRoom(r);
 });
 socket.on('room:join',({code:c,name},cb=()=>{})=>{
  c=String(c||'').trim().toUpperCase();name=String(name||'').trim().slice(0,20);const r=rooms.get(c);
  if(!r)return cb({error:'Room not found. Check the code.'});if(!name)return cb({error:'Enter a nickname.'});
  if(r.players.size>=8)return cb({error:'This room is full (8 players).'});
  if(r.phase!=='lobby')return cb({error:'This game has already started.'});
  const p={id:socket.id,name,score:0,connected:true,lastSeen:Date.now()};r.players.set(socket.id,p);socket.join(c);socket.data.room=c;cb({code:c});sendRoom(r);
 });
 socket.on('game:start',()=>{
  const r=rooms.get(socket.data.room);if(!r||r.hostId!==socket.id)return notice(socket,'Only the host can start.');
  if(r.players.size<2)return notice(socket,'You need at least 2 players to start.');
  beginRound(r);
 });
 socket.on('answer:submit',({text})=>{
  const r=rooms.get(socket.data.room);if(!r||r.phase!=='submit')return;
  const p=r.players.get(socket.id);text=String(text||'').trim().slice(0,120);
  if(!p||!p.connected||!text)return notice(socket,'Enter an answer first.');
  if(r.submissions.some(s=>s.playerId===socket.id))return notice(socket,'You already submitted this round.');
  r.submissions.push({id:socket.id+'-'+Date.now(),text,playerId:socket.id});socket.emit('answer:submitted');sendRoom(r);
  if([...r.players.values()].filter(p=>p.connected).every(p=>r.submissions.some(s=>s.playerId===p.id)))startVote(r);
 });
 socket.on('vote:submit',({choiceId})=>{
  const r=rooms.get(socket.data.room);if(!r||r.phase!=='vote')return;
  if(!r.players.has(socket.id))return;
  const c=r.choices.find(x=>x.id===choiceId);if(!c)return notice(socket,'That choice is not available.');
  if(c.playerId===socket.id)return notice(socket,'You cannot vote for your own fake answer.');
  if(r.votes[socket.id])return notice(socket,'Your vote is already locked in.');
  r.votes[socket.id]=choiceId;socket.emit('vote:submitted');sendRoom(r);
  if([...r.players.values()].filter(p=>p.connected).every(p=>r.votes[p.id]))finishVote(r);
 });
 socket.on('game:next',()=>{
  const r=rooms.get(socket.data.room);if(!r||r.hostId!==socket.id||r.phase!=='reveal')return;
  beginRound(r);
 });
 socket.on('game:rematch',()=>{
  const r=rooms.get(socket.data.room);if(!r||r.hostId!==socket.id||r.phase!=='finished')return;
  r.round=0;for(const p of r.players.values())p.score=0;r.phase='lobby';r.results=null;sendRoom(r);
 });
 socket.on('room:reconnect',({code:c,name},cb=()=>{})=>{
  c=String(c||'').trim().toUpperCase();const r=rooms.get(c);if(!r)return cb({error:'Room not found.'});
  const p=[...r.players.values()].find(p=>p.name===String(name||'').trim()&&!p.connected);
  if(!p)return cb({error:'No disconnected player with that nickname found.'});
  r.players.delete(p.id);p.id=socket.id;p.connected=true;p.lastSeen=Date.now();r.players.set(socket.id,p);
  if(r.hostId===p.id)r.hostId=socket.id;socket.join(c);socket.data.room=c;cb({code:c});sendRoom(r);
 });
 socket.on('disconnect',()=>{
  const r=rooms.get(socket.data.room);if(!r)return;
  const p=r.players.get(socket.id);if(p){p.connected=false;p.lastSeen=Date.now();}
  if(r.hostId===socket.id){const next=[...r.players.values()].find(x=>x.connected);if(next)r.hostId=next.id;}
  sendRoom(r);
  setTimeout(()=>{if(!r.players.has(socket.id)||r.players.get(socket.id).connected)return; if(r.phase==='lobby')r.players.delete(socket.id);sendRoom(r);},30000);
 });
});
server.listen(PORT,'0.0.0.0',()=>console.log('Fake Fact listening on '+PORT));