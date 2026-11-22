import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {build} from 'esbuild';
const read=p=>readFile(p,'utf8');
await mkdir('static',{recursive:true});
const css=await read('src/style.css'),layout=await read('src/layout.html');
const code="import {pair,review,checkPins} from './engine.mjs';import corpus from './corpus.json';\n"+await read('src/app.js');
for(const live of [false,true]){
 const bridge=live?"import {invoke} from '@forge/bridge';window.ssInvoke=invoke;\n":"";
 const built=await build({stdin:{contents:bridge+code,resolveDir:process.cwd()+'/src',loader:'js'},write:false,bundle:true,platform:'browser',format:'iife',minify:true,legalComments:'none'});
 const js=built.outputFiles[0].text;
 if(live){
 await writeFile('static/app.js',js);await writeFile('static/style.css',css);
 await writeFile('static/index.html',layout.replace('STYLE','<link rel="stylesheet" href="./style.css">').replace('SCRIPT','<script src="./app.js"></script>'));
 }else await writeFile('Review Second Shift.html',layout.replace('STYLE',()=>'<style>'+css+'</style>').replace('SCRIPT',()=>'<script>'+js.replace(/<\/script/gi,'<\\/script')+'</script>'));
}

