import { DefaultNamingStrategy, NamingStrategyInterface, Table } from 'typeorm';

export class ProjectNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  primaryKeyName(tableOrName: Table | string, columnNames: string[]): string {
    let tableName = (tableOrName instanceof Table) ? tableOrName.name : tableOrName;
    return `PK_${tableName}`;
  }
}