// ECE2502 班级评议 · 一键导出统计结果
// 用法：在“班级评议投票”文件夹里双击 导出结果.cmd（或运行 node 导出结果.mjs）
// 会在桌面生成两个 CSV：统计结果、明细。需已用 tcb login 登录过。
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ENV = 'ece2502-d0gx3cvdkeaf14920';
const NAMES = ["崔凌韵","陈愉信","冯心怡","何石翰风","黄悦洋","黄啸","纪王开来","焦昱杭","李卓","骆艺昀","李博源","李瑾雯","李顺杰","刘修存","卢艺萱","刘洛菲","罗健维","庞家乐","钱可欣","马景程","任相仪","施骁骏","唐桸原","王晨好","王启涵","徐至澳","俞跃","吴夏康成","张予辰","张臻哲","曾旭晨","张家铭","张文诚","张真慈","郑文龙","庄喆"];
const W = { e:3, g:2, p:1 };

function runSQL(sql){
  const cmd = `npx -y -p @cloudbase/cli tcb db execute -e ${ENV} --json --sql "${sql.replace(/"/g,'\\"')}"`;
  const out = execSync(cmd,
    { encoding:'utf8', env:{...process.env, CLOUDBASE_DISABLE_TELEMETRY:'true'}, maxBuffer:1024*1024*64 });
  const i = out.indexOf('{'), j = out.lastIndexOf('}');
  if(i<0) throw new Error('未拿到数据，可能未登录。请先运行： npx -y -p @cloudbase/cli tcb login\n原始输出：\n'+out);
  const obj = JSON.parse(out.slice(i, j+1));
  const data = obj.Data || obj.data || obj;
  const cols = data.Columns || data.columns;
  const rows = (data.Rows || data.rows || []).map(r => typeof r==='string' ? JSON.parse(r) : r);
  return rows.map(arr => Object.fromEntries(cols.map((c,k)=>[c, arr[k]])));
}
function toArr(v){ if(Array.isArray(v)) return v; if(v==null||v==='') return []; try{ return JSON.parse(v); }catch{ return String(v).split(/[、,，]/).map(s=>s.trim()).filter(Boolean); } }
function esc(x){ return '"' + String(x==null?'':x).replace(/"/g,'""') + '"'; }
function save(name, csv){ const p = path.join(os.homedir(),'Desktop',name); writeFileSync(p, '﻿'+csv, 'utf8'); return p; }

const recs = runSQL('SELECT voter, excellent, good, pass, ts, created_at FROM evaluations ORDER BY created_at');
// 按评议人去重，保留最新
const byVoter = {};
for(const r of recs){
  const v = (r.voter||'').trim();
  const t = Number(r.ts||0) || Date.parse(r.created_at||0) || 0;
  if(!byVoter[v] || t >= byVoter[v]._t) byVoter[v] = { voter:v, e:toArr(r.excellent), g:toArr(r.good), p:toArr(r.pass), _t:t };
}
const ballots = Object.values(byVoter);

// 统计
const tally = {}; NAMES.forEach(n=>tally[n]={e:0,g:0,p:0});
ballots.forEach(b=>{ b.e.forEach(n=>tally[n]&&tally[n].e++); b.g.forEach(n=>tally[n]&&tally[n].g++); b.p.forEach(n=>tally[n]&&tally[n].p++); });
const data = NAMES.map(n=>{ const t=tally[n]; const votes=t.e+t.g+t.p; const score=t.e*W.e+t.g*W.g+t.p*W.p; return {n,...t,votes,score,avg:votes?score/votes:0}; });
data.sort((a,b)=> b.score-a.score || b.e-a.e);

let stat=[["排名","姓名","优秀票","良好票","合格票","总票数","加权分(优3良2合1)","平均分"]];
data.forEach((r,i)=> stat.push([i+1,r.n,r.e,r.g,r.p,r.votes,r.score,r.avg.toFixed(2)]));
const p1 = save('ECE2502班级评议_统计结果.csv', stat.map(r=>r.map(esc).join(',')).join('\r\n'));

const L={e:'优秀',g:'良好',p:'合格'};
let det=[["评议人","被评议人","档次"]];
ballots.forEach(b=>['e','g','p'].forEach(t=>b[t].forEach(n=>det.push([b.voter,n,L[t]]))));
const p2 = save('ECE2502班级评议_明细.csv', det.map(r=>r.map(esc).join(',')).join('\r\n'));

console.log(`✅ 已导出 ${ballots.length} 位评议人的数据：`);
console.log('  统计结果 → '+p1);
console.log('  评议明细 → '+p2);
