import cluster from "cluster";
import os from "os";
import { initializeWorkerApp } from "./app";

const numCPUs = os.cpus().length;

if (cluster.isPrimary) {
  console.log(`🟢 Primary process ${process.pid} is running`);
  for (let i = 0; i < 3; i++) cluster.fork();

  cluster.on("exit", (worker) => {
    console.log(`❌ Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  initializeWorkerApp().then(({ server }) => {
    const PORT = Number(process.env.PORT) || 8000;
    server.listen(PORT, "0.0.0.0", () =>
      console.log(`🚀 Worker ${process.pid} server running at http://0.0.0.0:${PORT}`)
    );
  });
}
