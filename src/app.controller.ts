import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { Response } from 'express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post("table")
  async createTable(@Res() response: Response) {
    await this.appService.createTableAsync();

    response.status(201).send();
  }

  @Post("item")
  async addItem(@Res() response: Response, @Body() body: any) {
    await this.appService.addItemAsync(body);

    response.status(201).send();
  }

  @Get("primary-key")
  async getByPrimaryKey(@Res() response: Response, @Query("id") id: string) {
    const result = await this.appService.getProductByIdAsync(id);

    response.status(200).json(result);
  }

  @Get("sorted-key")
  async getBySortedKey(@Res() response: Response, @Query("id") id: string, @Query("category") category: string) {
    const result = await this.appService.getProductByCategoryAsync(id, category);

    response.status(200).json(result);
  }

  @Get("global-index-key")
  async getByGlobalIndexKey(@Res() response: Response, @Query("value") value: number) {
    const result = await this.appService.getProductByGreaterValueAsync(value);

    response.status(200).json(result);
  }

  @Get("scan")
  async getByScan(@Res() response: Response, @Query("status") status: number, @Query("value") value: number) {
    const result = await this.appService.getProductByStatusAsync(status, value);

   response.status(200).json(result);
  }
}
