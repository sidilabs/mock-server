import { ApiData, ConfigInjection, StubCollection, StubsModule } from "../../@types";

export type FieldGenerator = {
  methods?: string[];
  callback: (response: any, config: ConfigInjection) => any;
};

export type FieldGeneratorMap = {
  [key: string]: FieldGenerator;
};

export type QueryFunction = (list: any[], value: any, config: ConfigInjection) => any[];
export type QueryOption = QueryFunction | "CONTAINS" | string | string[];

type OptionalNumber = number | null | undefined;

export type QueryFilterMap = {
  [key: string]: [OptionalNumber, QueryOption];
};

export type UrlParamsMethods = "LIST" | "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type UrlParamsMethodsMap = {
  [key: string]: UrlParamsMethods[];
};

export type ConfigList = {
  direct?: boolean;
  fields?: FieldGeneratorMap;
  query?: QueryFilterMap;
  urlParams?: UrlParamsMethodsMap;
};

function fillData(functionStr: string, relation: { [key: string]: string }) {
  Object.keys(relation).forEach((key) => {
    functionStr = functionStr.replace(new RegExp(key, "g"), relation[key]);
  });
  return functionStr;
}

function parseParams(url: string, method: UrlParamsMethods, urlParams?: UrlParamsMethodsMap, onlyRemove = false) {
  if (urlParams) {
    let resultUrl = url;
    Object.keys(urlParams).forEach((urlParam) => {
      let methods = urlParams[urlParam];
      if (!methods.includes(method)) {
        resultUrl = resultUrl.replace("/" + urlParam, "");
      }
    });
    return onlyRemove ? resultUrl : resultUrl.replace(/:[^\/#?]+/, "([^\\/#?]+)");
  } else {
    return onlyRemove ? url : url.replace(/:[^\/#?]+/, "([^\\/#?]+)");
  }
}

export function initStubs(name: string, configApi: ApiData<ConfigList>, db: string): StubsModule {
  let jsonFields: any = "";
  if (configApi.config?.fields) {
    const fields = configApi.config?.fields || {};
    jsonFields = Object.keys(fields).reduce((acc, fieldName: string) => {
      const generator = fields[fieldName];
      acc = {
        ...acc,
        [fieldName]: { ...generator, callback: generator.callback.toString() },
      };
      return acc;
    }, {});
  }

  let queryFields: any = "";
  if (configApi.config?.query) {
    const query = configApi.config?.query || {};
    queryFields = Object.keys(query).reduce((acc, fieldName: string) => {
      const queryItem = query[fieldName][1];
      acc = {
        ...acc,
        [fieldName]: [
          query[fieldName][0],
          typeof queryItem == "function" ? queryItem.toString() : JSON.stringify(queryItem),
        ],
      };
      return acc;
    }, {});
  }

  let __FIELDS__: FieldGeneratorMap = {}; /*"to be overwrited when called fillData";*/
  let __QUERY__: QueryFilterMap;

  const relation = {
    "###db###": db,
    "###state###": `${configApi.state}`,
    "###api###": configApi.api,
    "###direct###": JSON.stringify(!!configApi.config?.direct),
    __FIELDS__: JSON.stringify(jsonFields),
    __QUERY__: JSON.stringify(queryFields),
  };

  function injectGet(config: ConfigInjection) {
    const stateDefinition = {
      "###state###": {
        lastId: 0,
        data: [],
      },
    };

    if (!config.state["###db###"]) {
      config.state["###db###"] = stateDefinition;
    } else if (!config.state["###db###"]["###state###"]) {
      config.state["###db###"]["###state###"] = stateDefinition["###state###"];
    }
    const state = config.state["###db###"]["###state###"];

    const id = config.request.path.replace(new RegExp("^###api###/".replace(/:[^\/#?]+/g, "([^\\/#?]+)")), "");

    let objResponse = state.data.find((entity: any) => entity.id == id);
    let fields: FieldGeneratorMap = __FIELDS__;
    if (fields) {
      fields = Object.keys(fields).reduce((acc, fieldName) => {
        let fieldGenerator: FieldGenerator = fields[fieldName];
        if (!fieldGenerator.methods || fieldGenerator.methods.includes("GET")) {
          return { ...acc, [fieldName]: { ...fieldGenerator, callback: eval(`(${fieldGenerator.callback})`) } };
        } else {
          return acc;
        }
      }, {});

      Object.keys(fields).forEach((fieldName) => {
        const generator = fields[fieldName].callback;
        objResponse = { ...objResponse, [fieldName]: generator(objResponse, config) };
      });
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: objResponse,
    };
  }

  function injectPost(config: ConfigInjection) {
    const stateDefinition = {
      "###state###": {
        lastId: 0,
        data: [],
      },
    };
    if (!config.state["###db###"]) {
      config.state["###db###"] = stateDefinition;
    } else if (!config.state["###db###"]["###state###"]) {
      config.state["###db###"]["###state###"] = stateDefinition["###state###"];
    }
    const state = config.state["###db###"]["###state###"];
    state.lastId++;
    let result = { id: state.lastId, ...JSON.parse(config.request.body) };

    let fields: FieldGeneratorMap = __FIELDS__;
    if (fields) {
      fields = Object.keys(fields).reduce((acc, fieldName) => {
        let fieldGenerator: FieldGenerator = fields[fieldName];
        if (!fieldGenerator.methods || fieldGenerator.methods.includes("POST")) {
          return { ...acc, [fieldName]: { ...fieldGenerator, callback: eval(`(${fieldGenerator.callback})`) } };
        } else {
          return acc;
        }
      }, {});

      Object.keys(fields).forEach((fieldName) => {
        const generator = fields[fieldName].callback;
        result = { ...result, [fieldName]: generator(result, config) };
      });
    }

    state.data.push(result);
    return {
      headers: {
        "Content-Type": "application/json",
      },
      statusCode: 201,
      body: result,
    };
  }

  function injectPut(config: ConfigInjection) {
    const stateDefinition = {
      "###state###": {
        lastId: 0,
        data: [],
      },
    };
    if (!config.state["###db###"]) {
      config.state["###db###"] = stateDefinition;
    } else if (!config.state["###db###"]["###state###"]) {
      config.state["###db###"]["###state###"] = stateDefinition["###state###"];
    }
    const state = config.state["###db###"]["###state###"];

    const id = config.request.path.replace(new RegExp("^###api###/".replace(/:[^\/#?]+/, "([^\\/#?]+)")), "");

    const index: number = state.data.findIndex((entity: any) => entity.id == id);
    let result: any;
    if (state.data[index]) {
      const entity = state.data[index];
      result = { ...entity, ...JSON.parse(config.request.body) };

      let fields: FieldGeneratorMap = __FIELDS__;
      if (fields) {
        fields = Object.keys(fields).reduce((acc, fieldName) => {
          let fieldGenerator: FieldGenerator = fields[fieldName];
          if (!fieldGenerator.methods || fieldGenerator.methods.includes("PUT")) {
            return { ...acc, [fieldName]: { ...fieldGenerator, callback: eval(`(${fieldGenerator.callback})`) } };
          } else {
            return acc;
          }
        }, {});

        Object.keys(fields).forEach((fieldName) => {
          const generator = fields[fieldName].callback;
          result = { ...result, [fieldName]: generator(result, config) };
        });
      }

      state.data[index] = result;
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: result,
    };
  }

  function injectDelete(config: ConfigInjection) {
    const stateDefinition = {
      "###state###": {
        lastId: 0,
        data: [],
      },
    };
    if (!config.state["###db###"]) {
      config.state["###db###"] = stateDefinition;
    } else if (!config.state["###db###"]["###state###"]) {
      config.state["###db###"]["###state###"] = stateDefinition["###state###"];
    }
    const state = config.state["###db###"]["###state###"];
    const id = config.request.path.replace(new RegExp("^###api###/".replace(/:[^\/#?]+/, "([^\\/#?]+)")), "");
    state.data = state.data.filter((entity: any) => entity.id != id);

    return {
      headers: {
        "Content-Type": "application/json",
      },
      statusCode: 204,
      body: "",
    };
  }

  function injectList(config: ConfigInjection, injectState: any, logger: any, resolve: any, imposterState: any) {
    const stateDefinition = {
      "###state###": {
        lastId: 0,
        data: [],
      },
    };

    const urlApi = "###api###";
    let paramsArray: string[] = urlApi.split("/").filter((k) => /^:.*/.test(k));

    let paramValues: any = {};
    if (paramsArray?.length) {
      const urlApiRegExp = new RegExp(urlApi.replace(/:[^\/#?]+/g, "([^\\/#?]+)"));
      const resultRE = urlApiRegExp.exec(config.request.path);
      const idsValues = resultRE?.length ? resultRE.slice(1, 1 + paramsArray.length) : [];
      for (let i in idsValues) {
        let param = paramsArray[i];
        let idValue = idsValues[i];
        paramValues[param.replace(/^:/, "")] = idValue;
      }
    }
    if (!config.state["###db###"]) {
      config.state["###db###"] = stateDefinition;
    } else if (!config.state["###db###"]["###state###"]) {
      config.state["###db###"]["###state###"] = stateDefinition["###state###"];
    }
    const entityRef = config.state["###db###"]["###state###"];
    let list: any[] = entityRef.data;
    if (Object.keys(paramValues).length) {
      list = list.filter((item: any) => {
        let isOk = true;
        Object.keys(paramValues).forEach((param: any) => {
          let value = paramValues[param];
          if (item[param] != value) {
            isOk = false;
          }
        });
        return isOk;
      });
    }

    let fields: FieldGeneratorMap = __FIELDS__;
    if (list.length && fields) {
      fields = Object.keys(fields).reduce((acc, fieldName) => {
        let fieldGenerator: FieldGenerator = fields[fieldName];
        if (!fieldGenerator.methods || fieldGenerator.methods.includes("LIST")) {
          return { ...acc, [fieldName]: { ...fieldGenerator, callback: eval(`(${fieldGenerator.callback})`) } };
        } else {
          return acc;
        }
      }, {});
      list = list.map((item) => {
        let result = { ...item };
        Object.keys(fields).forEach((fieldName) => {
          const generator = fields[fieldName].callback;
          result = { ...result, [fieldName]: generator(result, config) };
        });
        return result;
      });
    }

    let count = list.length;

    let querys = __QUERY__;

    if (querys) {
      querys = Object.keys(querys).reduce((acc, queryName) => {
        let queryFilter: QueryOption = querys[queryName][1];
        return { ...acc, [queryName]: eval(`(${queryFilter})`) };
      }, {});

      function doFilter(_list: any[], objParam: string, value: any, filterType: string) {
        let list = _list;
        if (/^CONTAINS$/.test(filterType)) {
          list = _list.filter((item) => {
            return item[objParam].toString().toLowerCase().indexOf(value.toLowerCase()) >= 0;
          });
        } else {
          list = _list.filter((item) => item[objParam] == value);
        }
        return list;
      }

      function runQuerys(_querys: QueryFilterMap) {
        Object.keys(_querys).forEach((queryRule) => {
          const queryFilter: QueryOption = _querys[queryRule][1];
          if (typeof queryFilter == "object" && queryFilter instanceof Array) {
            const [param, filterType] = queryFilter;
            const value = config.request.query[queryRule];
            if (value != undefined) {
              list = doFilter(list, param, value, filterType);
            }
          } else {
            const value = config.request.query[queryRule];
            if (value != undefined) {
              if (typeof queryFilter == "function") {
                list = queryFilter(list, value, config);
              } else {
                list = doFilter(list, queryRule, value, queryFilter);
              }
            }
          }
        });
      }

      let querysBefore: { [key: string]: QueryFilterMap } = {};
      let querysAfter: { [key: string]: QueryFilterMap } = {};
      Object.keys(querys).forEach((queryRule) => {
        const query = querys[queryRule];
        let priority = query[0] ?? 5;
        if (priority < 10) {
          if (!querysBefore[priority]) {
            querysBefore[priority] = { [queryRule]: querys[queryRule] };
          } else {
            querysBefore[priority][queryRule] = querys[queryRule];
          }
        } else {
          if (!querysAfter[priority]) {
            querysAfter[priority] = { [queryRule]: querys[queryRule] };
          } else {
            querysAfter[priority][queryRule] = querys[queryRule];
          }
        }
      });

      Object.keys(querysBefore).forEach((priority) => {
        let querysMap = querysBefore[priority];
        runQuerys(querysMap);
      });

      count = list.length;

      Object.keys(querysAfter).forEach((priority) => {
        let querysMap = querysAfter[priority];
        runQuerys(querysMap);
      });
    }

    return {
      statusCode: 200,

      body: {
        list,
        total: count,
      },
    };
  }

  function injectLoadData(config: ConfigInjection) {
    const stateDefinition = {
      "###state###": {
        lastId: 0,
        data: [],
      },
    };
    if (!config.state["###db###"]) {
      config.state["###db###"] = stateDefinition;
    } else if (!config.state["###db###"]["###state###"]) {
      config.state["###db###"]["###state###"] = stateDefinition["###state###"];
    }
    const state = config.state["###db###"]["###state###"];
    const jsonDataArray: any[] = JSON.parse(config.request.body);
    jsonDataArray.forEach((data) => {
      if (state.lastId < data.id) {
        state.lastId = data.id;
      }
    });
    state.data = jsonDataArray;
    return {
      statusCode: 204,
    };
  }

  const filledList = fillData(injectList.toString(), {
    ...relation,
    "###api###": parseParams(configApi.api, "LIST", configApi.config?.urlParams, true),
  });

  const stubs: StubCollection = {
    get: {
      stub: {
        predicates: [
          {
            matches: { method: "GET", path: parseParams(configApi.api, "GET", configApi.config?.urlParams) + "/\\d+$" },
          },
        ],
        responses: [
          {
            inject: fillData(injectGet.toString(), {
              ...relation,
              "###api###": parseParams(configApi.api, "GET", configApi.config?.urlParams, true),
            }),
          },
        ],
      },
    },
    list: {
      stub: {
        predicates: [
          {
            matches: {
              method: "GET",
              path: parseParams(configApi.api, "LIST", configApi.config?.urlParams) + "/?([?#].+)?$",
            },
          },
        ],
        responses: [
          {
            inject: filledList,
          },
        ],
      },
    },
    post: {
      stub: {
        predicates: [
          {
            matches: { method: "POST", path: parseParams(configApi.api, "POST", configApi.config?.urlParams) + "/?$" },
          },
        ],
        responses: [
          {
            inject: fillData(injectPost.toString(), {
              ...relation,
              "###api###": parseParams(configApi.api, "POST", configApi.config?.urlParams, true),
            }),
          },
        ],
      },
    },
    put: {
      stub: {
        predicates: [
          {
            matches: { method: "PUT", path: parseParams(configApi.api, "PUT", configApi.config?.urlParams) + "/\\d+$" },
          },
        ],
        responses: [
          {
            inject: fillData(injectPut.toString(), {
              ...relation,
              "###api###": parseParams(configApi.api, "PUT", configApi.config?.urlParams, true),
            }),
          },
        ],
      },
    },
    delete: {
      stub: {
        predicates: [
          {
            matches: {
              method: "DELETE",
              path: parseParams(configApi.api, "DELETE", configApi.config?.urlParams) + "/\\d+$",
            },
          },
        ],
        responses: [
          {
            inject: fillData(injectDelete.toString(), {
              ...relation,
              "###api###": parseParams(configApi.api, "DELETE", configApi.config?.urlParams, true),
            }),
          },
        ],
      },
    },
  };

  let stubsFiltered = stubs;
  if (configApi.methods?.length) {
    stubsFiltered = {};
    configApi.methods.forEach((key) => {
      const nKey = key.toLowerCase();
      stubsFiltered[nKey] = stubs[nKey];
    });
  }

  return { ["(api)" + name]: stubsFiltered };
}
