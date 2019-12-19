import { Injectable } from "@nestjs/common";
import { DiscoveryService } from "@nestjs/core";
import { MetadataScanner } from "@nestjs/core/metadata-scanner";
import {
  COMMAND_MODULE_COMMANDER_DECORATOR,
  COMMAND_MODULE_COMMANDER_OPTION_DECORATOR,
  COMMAND_MODULE_COMMAND_DECORATOR,
  COMMAND_MODULE_COMMAND_OPTION_DECORATOR,
  COMMAND_MODULE_COMMAND_POSITIONAL_DECORATOR,
} from "./command.constants";
import { Command, Commander, CommanderOption, CommandOption, CommandPositional } from "./command.interface";
@Injectable()
export class ExplorerService {
  constructor(private readonly discoveryService: DiscoveryService, private readonly metadataScanner: MetadataScanner) {}

  public explore(): Commander[] {
    const commanders = this.getCommanders();

    for (const commander of commanders) {
      const commands = this.getCommands(commander);

      commander.options = this.getCommanderOptions(commander);

      for (const command of commands) {
        command.options = this.getCommandOptions(commander, command);
        command.positionals = this.getCommandPositionals(commander, command);
      }

      commander.commands = commands;
    }
    return this.mergeCommanders(commanders);
  }

  private getCommanders(): Commander[] {
    const commanders: Commander[] = [];

    const classInstanceWrappers = this.discoveryService
      .getProviders()
      .filter(instanceWrapper => instanceWrapper.instance)
      .filter(({ instance }) => instance.constructor);

    for (const classInstanceWrapper of classInstanceWrappers) {
      const metadata = Reflect.getMetadata(
        COMMAND_MODULE_COMMANDER_DECORATOR,
        classInstanceWrapper.instance.constructor,
      );

      if (metadata) {
        commanders.push({ instance: classInstanceWrapper.instance, ...metadata });
      }
    }

    return commanders;
  }

  private getCommands(commander: Commander): Command[] {
    const instance = commander.instance;
    const prototype = Object.getPrototypeOf(instance);
    const commands: Command[] = [];

    for (const methodName of this.metadataScanner.getAllFilteredMethodNames(prototype)) {
      const metadata = Reflect.getMetadata(COMMAND_MODULE_COMMAND_DECORATOR, prototype[methodName]);
      if (metadata) {
        commands.push({ instance: prototype[methodName].bind(instance), ...metadata });
      }
    }

    return commands;
  }

  private getCommanderOptions(commander: Commander): CommanderOption[] {
    const instance = commander.instance;
    let options: CommanderOption[] = Reflect.getMetadata(COMMAND_MODULE_COMMANDER_OPTION_DECORATOR, instance);

    if (!Array.isArray(options)) {
      options = [];
    }

    return options;
  }

  private getCommandOptions(commander: Commander, command: Command): CommandOption[] {
    const options = Reflect.getMetadata(
      COMMAND_MODULE_COMMAND_OPTION_DECORATOR,
      commander.instance,
      command.instance.name.replace("bound ", ""),
    ) as CommandOption[];

    if (Array.isArray(options)) {
      return options;
    }
    return [];
  }

  private getCommandPositionals(commander: Commander, command: Command): CommandPositional[] {
    const positionals = Reflect.getMetadata(
      COMMAND_MODULE_COMMAND_POSITIONAL_DECORATOR,
      commander.instance,
      command.instance.name.replace("bound ", ""),
    ) as CommandPositional[];

    if (Array.isArray(positionals)) {
      return positionals;
    }

    return [];
  }

  private mergeCommanders(commanders: Commander[]): Commander[] {
    const mergedCommanders: Map<string, Commander> = new Map<string, Commander>();
    for (const commander of commanders) {
      const commanderName = commander.name ?? "";
      if (mergedCommanders.has(commanderName)) {
        mergedCommanders.get(commanderName)?.commands.push(...commander.commands);
      } else {
        mergedCommanders.set(commanderName, commander);
      }
    }

    return Array.from(mergedCommanders.values()).filter(
      commander => commander.commands.length !== 0 || commander.options.length !== 0,
    );
  }
}
