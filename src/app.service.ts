import { Inject, Injectable } from '@nestjs/common';
import { DynamoDBClient, CreateTableCommand, PutItemCommand, GetItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  private static readonly _tableName = "produtos";
  private static _dynamodbClient: DynamoDBClient | null = null;

  constructor(@Inject() config: ConfigService) {
    AppService._dynamodbClient ??= new DynamoDBClient({
      apiVersion: "2012-08-10",
      region: config.get("AWS_REGION"),
      credentials: {
        accessKeyId: config.get("AWS_ACCESS_KEY"),
        secretAccessKey: config.get("AWS_SECRET_KEY")
      }
    });
  }

  async createTableAsync(): Promise<void> {
    await AppService._dynamodbClient.send(new CreateTableCommand({
      TableName: AppService._tableName,
      AttributeDefinitions: [
        { AttributeName: "Id", AttributeType: "S" }, // PK da tabela
        { AttributeName: "Category", AttributeType: "S" },   // SK da tabela
        { AttributeName: "Amount", AttributeType: "N" }, // PK do GSI
      ],
      KeySchema: [
        { AttributeName: "Id", KeyType: "HASH" },
        { AttributeName: "Category", KeyType: "RANGE" },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "AmountIndex",
          KeySchema: [
            { AttributeName: "Amount", KeyType: "HASH" }, // nova Partition Key
          ],
          Projection: {
            ProjectionType: "ALL", // pode ser KEYS_ONLY, INCLUDE ou ALL
          },
        },
      ],
      BillingMode: "PAY_PER_REQUEST",
    }));
  }

  async addItemAsync(data: { id: string, status: string, value: string, category: string }): Promise<void> {
    await AppService._dynamodbClient.send(new PutItemCommand({
      TableName: AppService._tableName,
      Item: {
        Id: { S: data.id },
        ProductStatus: { N: data.status },
        Amount: { N: data.value },
        Category: { S: data.category },
      }
    }));
  }

  // by primary key - dont return all items of tables and not filter in memory
  async getProductByIdAsync(id: string): Promise<any> {
    const response = await AppService._dynamodbClient.send(new QueryCommand({
      TableName: AppService._tableName,
      ExpressionAttributeValues: {
        ":id": { S: id },
      },
      KeyConditionExpression: "Id = :id",
    }));

    console.log(JSON.stringify({
      type: "PRIMARY KEY",
      scan: response.ScannedCount,
    }));

    return response.Items?.[0];
  }

  // by sorted key (LSI) - dont return all items of tables and not filter in memory
  async getProductByCategoryAsync(id: string, category: string): Promise<any[]> {
    const response = await AppService._dynamodbClient.send(new QueryCommand({
      ExpressionAttributeValues: {
        ":category": { S: category },
        ":id": { S: id },
      },
      KeyConditionExpression: "Category = :category and Id = :id",
      TableName: AppService._tableName,
    }));

    console.log(JSON.stringify({
      type: "PRIMARY KEY AND SORTED KEY - LSI",
      scan: response.ScannedCount,
    }));

    return response.Items;
  }

  // by GSI index - dont return all items of tables and not filter in memory
  async getProductByGreaterValueAsync(value: number): Promise<any[]> {
    const response = await AppService._dynamodbClient.send(new QueryCommand({
      ExpressionAttributeValues: {
        ":value": { N: value.toString() },
      },
      KeyConditionExpression: "Amount = :value",
      TableName: AppService._tableName,
      IndexName: "AmountIndex",
    }));

    console.log(JSON.stringify({
      type: "GSI",
      scan: response.ScannedCount,
    }));

    return response.Items;
  }

  // by scan - return all items of tables and filter in memory
  async getProductByStatusAsync(status: number, value: number): Promise<any[]> {
    const response = await AppService._dynamodbClient.send(new QueryCommand({
      ExpressionAttributeValues: {
        ":status": { N: status.toString() },
        ":value": { N: value.toString() },
      },
      KeyConditionExpression: "Amount = :value",
      FilterExpression: "ProductStatus = :status",
      TableName: AppService._tableName,
      IndexName: "AmountIndex",
    }));

    console.log(JSON.stringify({
      type: "SCAN",
      scan: response.ScannedCount,
    }));

    return response.Items;
  }
}
