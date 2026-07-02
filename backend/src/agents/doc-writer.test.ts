import dotenv from "dotenv";
dotenv.config();

import { runDocWriter, DocWriterInput } from "./doc-writer";

// Example test input simulating a small project without README
const testInputWithoutReadme: DocWriterInput = {
  repoName: "my-awesome-project",
  files: [
    {
      path: "src/index.ts",
      content: `
import express from 'express';
import { UserController } from './controllers/userController';

const app = express();
const userController = new UserController();

app.get('/users', userController.getUsers);
app.post('/users', userController.createUser);

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
      `,
      extension: ".ts",
    },
    {
      path: "src/controllers/userController.ts",
      content: `
import { UserService } from '../services/userService';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  async getUsers(req: any, res: any) {
    const users = await this.userService.getAllUsers();
    res.json(users);
  }

  async createUser(req: any, res: any) {
    const user = await this.userService.createUser(req.body);
    res.status(201).json(user);
  }
}
      `,
      extension: ".ts",
    },
    {
      path: "src/services/userService.ts",
      content: `
import { UserRepository } from '../repositories/userRepository';

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async getAllUsers() {
    return this.userRepository.findAll();
  }

  async createUser(userData: any) {
    return this.userRepository.create(userData);
  }
}
      `,
      extension: ".ts",
    },
    {
      path: "package.json",
      content: `
{
  "name": "my-awesome-project",
  "version": "1.0.0",
  "scripts": {
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.18.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "ts-node": "^10.9.0"
  }
}
      `,
      extension: ".json",
    },
  ],
};

async function testDocWriter() {
  console.log("Testing Doc Writer agent...");
  console.log("Input: 4 files representing a simple Express project\n");

  try {
    const result = await runDocWriter(testInputWithoutReadme);

    console.log("=== GENERATED README ===\n");
    console.log(result.readme);
    console.log("\n=== MISSING DOCUMENTATION ===");
    console.log(`Found ${result.missingDocs.length} items:`);
    result.missingDocs.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.file}: ${item.description}`);
    });

    console.log("\n✅ Test completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

testDocWriter();