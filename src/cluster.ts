import cluster from 'cluster';
import os from 'os';
import { initializeWorkerApp } from './app'; 

const numCPUs = os.cpus().length;

if (cluster.isPrimary) {
  console.log(` Primary process ${process.pid} is running`);
  console.log(` Forking ${numCPUs} workers...\n`);

  for (let i = 0; i < 1; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker,) => {
    console.log(` Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });

} else {
  initializeWorkerApp().catch(err => {
    console.error(`Worker ${process.pid} failed to initialize:`, err);
  });
}
