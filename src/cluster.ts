import cluster from "cluster";
import os from "os";

const numCPUs = os.cpus().length;

if (cluster.isPrimary) {
  console.log(` Primary process ${process.pid} is running`);
  console.log(` Forking ${numCPUs} workers...\n`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker) => {
    console.log(` Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });

} else {
  // Start the application inside each worker
  require("./app");
}
