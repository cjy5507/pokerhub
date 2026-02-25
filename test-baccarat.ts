import { syncBaccaratState } from './src/app/(games)/baccarat/actions';

async function main() {
  try {
    const res = await syncBaccaratState('vip-room');
    console.log(res);
  } catch (e) {
    console.error(e);
  }
}
main();
