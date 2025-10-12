import { db } from '../src/db/index.js';

async function main(){
  try{
    const res = await db.execute(`SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()`);
    console.log(res.rows ?? res);
  }catch(e){
    console.error('error', e);
  }finally{
    process.exit(0);
  }
}

main();
