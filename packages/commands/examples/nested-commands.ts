import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Command, Commander, CommandModule, CommandService } from "../src";

// ts-node -T ./examples/nested-commands.ts --help
@Commander({ describe: "nested command", name: "nested" })
class TestCommander {
  @Command({ describe: "exec nested command", name: "show" })
  public show(): void {
    console.log("Run nested command");
  }
}

@Module({
  imports: [
    CommandModule.register({
      scriptName: "your-package-cli",
      usage: "Usage: $0 --help",
    }),
  ],
  providers: [TestCommander],
})
class TestAppModule {}

(async (): Promise<void> => {
  const app = await NestFactory.createApplicationContext(TestAppModule, {
    logger: false,
  });
  app.get(CommandService).exec();
})();
