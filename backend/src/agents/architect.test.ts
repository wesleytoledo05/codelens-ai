import { runArchitect, ArchitectInput } from "./architect";

// Example test input simulating a small MVC project
const testInput: ArchitectInput = {
  files: [
    {
      path: "src/controllers/userController.ts",
      content: `
import { UserService } from '../services/userService';
import { Request, Response } from 'express';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  async getUser(req: Request, res: Response) {
    const user = await this.userService.findById(req.params.id);
    res.json(user);
  }
}
      `,
      extension: ".ts",
    },
    {
      path: "src/services/userService.ts",
      content: `
import { UserRepository } from '../repositories/userRepository';
import { User } from '../models/user';

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async findById(id: string): Promise<User> {
    return this.userRepository.findById(id);
  }
}
      `,
      extension: ".ts",
    },
    {
      path: "src/repositories/userRepository.ts",
      content: `
import { db } from '../database/connection';
import { User } from '../models/user';

export class UserRepository {
  async findById(id: string): Promise<User> {
    return db.query('SELECT * FROM users WHERE id = ?', [id]);
  }
}
      `,
      extension: ".ts",
    },
    {
      path: "src/models/user.ts",
      content: `
export interface User {
  id: string;
  name: string;
  email: string;
}
      `,
      extension: ".ts",
    },
    {
      path: "src/routes/userRoutes.ts",
      content: `
import { Router } from 'express';
import { UserController } from '../controllers/userController';

const router = Router();
const controller = new UserController();

router.get('/users/:id', controller.getUser.bind(controller));

export default router;
      `,
      extension: ".ts",
    },
  ],
};

async function testArchitect() {
  console.log("Testing Architect agent...");
  console.log("Input: 5 files representing an MVC architecture\n");

  try {
    const result = await runArchitect(testInput);

    console.log("=== ANALYSIS RESULT ===\n");
    console.log("Structure:");
    console.log("  Folders:", result.structure.folders);
    console.log("  Layers:", result.structure.layers);
    console.log("\nDependencies:", result.dependencies.length, "found");
    console.log("Patterns:", result.patterns);
    console.log("\nSuggestions:");
    result.suggestions.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s}`);
    });

    console.log("\n✅ Test completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

testArchitect();
