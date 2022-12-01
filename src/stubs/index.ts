import fs from "fs";
import path from "path";

import { packageBaseURL, extendModuleBehavior, MockConfig } from "../utils";

import { ApiStub, StubCollection, StubsModule } from "../@types";
import { initApi } from "../api-model";
import { options } from "./cors";

const loadStubs = (mockConfig: MockConfig) => {
  const { config, imposter } = mockConfig;
  const directory = config.stubsFolder;
  console.log("directory: " + directory);
  const dirs: string[] = fs
    .readdirSync(directory)
    .filter((file: string) => fs.lstatSync(path.resolve(directory, file)).isDirectory());
  let packages: [string, StubCollection][] = [];
  dirs.forEach((dirName: string) => {
    const apiStubMock: ApiStub = require(path.resolve(directory, dirName));
    if (!apiStubMock.stubs) {
      return;
    }
    if (apiStubMock.baseUrl) {
      packages.push([dirName, packageBaseURL(apiStubMock.baseUrl, apiStubMock.stubs)]);
    } else {
      packages.push([dirName, apiStubMock.stubs]);
    }
  });
  return Object.fromEntries(packages);
};

const loadApis = (mockConfig: MockConfig) => {
  const { config } = mockConfig;
  const directory = config.stubsFolder;
  const dirs: string[] = fs
    .readdirSync(directory)
    .filter((file: string) => fs.lstatSync(path.resolve(directory, file)).isDirectory());
  let apiStubsModule: StubsModule = {};
  dirs.forEach((dirName: string) => {
    const apiStubMock: ApiStub = require(path.resolve(directory, dirName));
    if (apiStubMock.apis) apiStubsModule = { ...apiStubsModule, ...initApi(mockConfig, dirName, apiStubMock.apis) };
  });
  return apiStubsModule;
};

export const loadStubModules = (mockConfig: MockConfig) => {
  const { config, imposter } = mockConfig;
  return {
    ...extendModuleBehavior({ ...loadApis(mockConfig), ...loadStubs(mockConfig), cors: { options } }, config, imposter),
  } as StubsModule;
};

export const loadStubsApiData = (mockConfig: MockConfig) => {
  const { config } = mockConfig;
  const directory = config.stubsFolder;
  const dirs: string[] = fs
    .readdirSync(directory)
    .filter((file: string) => fs.lstatSync(path.resolve(directory, file)).isDirectory());
  let apisData: { api: string; data: any[] }[] = [];
  let priorities: { [key: string]: any[] } = { 1: [] };
  dirs.forEach((dirName: string) => {
    const apiStubMock: ApiStub = require(path.resolve(directory, dirName));
    if (!apiStubMock.apis) return;
    Object.keys(apiStubMock.apis).forEach((key: string) => {
      if (!apiStubMock.apis) return;
      const apiConfig = apiStubMock.apis[key];
      if (apiConfig.data) {
        if (apiConfig.dataPriority) {
          priorities[apiConfig.dataPriority] = priorities[apiConfig.dataPriority] || [];
          priorities[apiConfig.dataPriority].push({ api: apiConfig.dataApi || apiConfig.api, data: apiConfig.data });
        } else {
          priorities[1].push({ api: apiConfig.dataApi || apiConfig.api, data: apiConfig.data });
        }
      }
    });
  });
  Object.keys(priorities).forEach((key) => {
    apisData = [...apisData, ...priorities[key]];
  });
  return apisData;
};
