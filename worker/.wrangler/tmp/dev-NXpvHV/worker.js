var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// .wrangler/tmp/bundle-BI7rOR/strip-cf-connecting-ip-header.js
var require_strip_cf_connecting_ip_header = __commonJS({
  ".wrangler/tmp/bundle-BI7rOR/strip-cf-connecting-ip-header.js"() {
    function stripCfConnectingIPHeader(input, init) {
      const request = new Request(input, init);
      request.headers.delete("CF-Connecting-IP");
      return request;
    }
    __name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
    globalThis.fetch = new Proxy(globalThis.fetch, {
      apply(target, thisArg, argArray) {
        return Reflect.apply(target, thisArg, [
          stripCfConnectingIPHeader.apply(null, argArray)
        ]);
      }
    });
  }
});

// .wrangler/tmp/bundle-BI7rOR/middleware-loader.entry.ts
var import_strip_cf_connecting_ip_header7 = __toESM(require_strip_cf_connecting_ip_header());

// wrangler-modules-watch:wrangler:modules-watch
var import_strip_cf_connecting_ip_header = __toESM(require_strip_cf_connecting_ip_header());

// .wrangler/tmp/bundle-BI7rOR/middleware-insertion-facade.js
var import_strip_cf_connecting_ip_header5 = __toESM(require_strip_cf_connecting_ip_header());

// worker.js
var import_strip_cf_connecting_ip_header2 = __toESM(require_strip_cf_connecting_ip_header());
var JSON_COLS = ["tag_decisions", "added_terms", "proposals"];
var worker_default = {
  async fetch(req, env) {
    const cors = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Reviewer",
      "Access-Control-Max-Age": "86400"
    };
    if (req.method === "OPTIONS")
      return new Response(null, { headers: cors });
    const out = /* @__PURE__ */ __name((body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } }), "out");
    try {
      const url = new URL(req.url);
      if (url.pathname === "/join" && req.method === "POST") {
        let name = "";
        try {
          name = String(JSON.parse(await req.text()).name || "");
        } catch (e) {
        }
        name = name.replace(/\s+/g, " ").trim();
        if (name.length < 2 || name.length > 80)
          return out({ error: "Please type your first and last name." }, 400);
        const found = await env.DB.prepare("SELECT code, name FROM reviewers WHERE lower(name) = lower(?)").bind(name).first();
        if (found)
          return out(found);
        const code2 = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
        await env.DB.prepare("INSERT INTO reviewers (code, name) VALUES (?, ?)").bind(code2, name).run();
        return out({ code: code2, name });
      }
      const code = (url.searchParams.get("r") || req.headers.get("X-Reviewer") || "").trim();
      const me = code ? await env.DB.prepare("SELECT code, name FROM reviewers WHERE code = ?").bind(code).first() : null;
      if (!me)
        return out({ error: "Unknown reviewer link." }, 401);
      const names = Object.fromEntries((await env.DB.prepare("SELECT code, name FROM reviewers").all()).results.map((r) => [r.code, r.name]));
      const shape = /* @__PURE__ */ __name((r) => {
        const o = { ...r, reviewer: names[r.reviewer_code] || "?" };
        JSON_COLS.forEach((c) => {
          try {
            o[c] = JSON.parse(r[c] || "null");
          } catch {
            o[c] = null;
          }
        });
        delete o.reviewer_code;
        o.mine = r.reviewer_code === me.code;
        return o;
      }, "shape");
      if (url.pathname === "/me")
        return out({ name: me.name });
      if (url.pathname === "/state" && req.method === "GET") {
        const b = url.searchParams.get("batch") || "";
        const all = (await env.DB.prepare("SELECT * FROM reviews WHERE batch_id = ?").bind(b).all()).results;
        const counts = {};
        all.forEach((r) => {
          const c = counts[r.result_id] ||= { started: 0, submitted: 0 };
          c.started++;
          if (r.submitted)
            c.submitted++;
        });
        const mine = all.filter((r) => r.reviewer_code === me.code).map(shape);
        const done = all.filter((r) => r.submitted && counts[r.result_id].submitted >= 2).map(shape);
        return out({ name: me.name, mine, counts, done });
      }
      if (url.pathname === "/review" && (req.method === "PUT" || req.method === "POST")) {
        const r = JSON.parse(await req.text());
        if (!r.result_id || !r.batch_id)
          return out({ error: "result_id and batch_id are required." }, 400);
        const others = (await env.DB.prepare("SELECT reviewer_code, submitted FROM reviews WHERE result_id = ? AND reviewer_code != ?").bind(r.result_id, me.code).all()).results;
        const otherSubmitted = others.filter((o) => o.submitted).length;
        const own = await env.DB.prepare("SELECT submitted FROM reviews WHERE result_id = ? AND reviewer_code = ?").bind(r.result_id, me.code).first();
        if (otherSubmitted >= 2)
          return out({ error: "This result already has two reviews." }, 409);
        if (own && own.submitted && otherSubmitted >= 1)
          return out({ error: "Both reviews are submitted; this review is locked." }, 409);
        const b = /* @__PURE__ */ __name((v) => v === true ? 1 : v === false ? 0 : null, "b");
        await env.DB.prepare(`INSERT INTO reviews (result_id, batch_id, reviewer_code, submitted, adaptation_ok, adaptation_verdict,
            mitigation_ok, mitigation_verdict, tag_decisions, added_terms, proposals, comment)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (result_id, reviewer_code) DO UPDATE SET submitted = excluded.submitted,
            adaptation_ok = excluded.adaptation_ok, adaptation_verdict = excluded.adaptation_verdict,
            mitigation_ok = excluded.mitigation_ok, mitigation_verdict = excluded.mitigation_verdict,
            tag_decisions = excluded.tag_decisions, added_terms = excluded.added_terms, proposals = excluded.proposals,
            comment = excluded.comment, updated_at = datetime('now')`).bind(
          r.result_id,
          r.batch_id,
          me.code,
          r.submitted ? 1 : 0,
          b(r.adaptation_ok),
          r.adaptation_verdict || null,
          b(r.mitigation_ok),
          r.mitigation_verdict || null,
          JSON.stringify(r.tag_decisions || {}),
          JSON.stringify(r.added_terms || []),
          JSON.stringify(r.proposals || []),
          r.comment || null
        ).run();
        const saved = await env.DB.prepare("SELECT * FROM reviews WHERE result_id = ? AND reviewer_code = ?").bind(r.result_id, me.code).first();
        return out(shape(saved));
      }
      if (url.pathname === "/export" && req.method === "GET") {
        const b = url.searchParams.get("batch") || "";
        const all = (await env.DB.prepare("SELECT * FROM reviews WHERE batch_id = ? ORDER BY result_id, created_at").bind(b).all()).results;
        const counts = {};
        all.forEach((r) => {
          if (r.submitted)
            counts[r.result_id] = (counts[r.result_id] || 0) + 1;
        });
        return out(all.filter((r) => r.reviewer_code === me.code || r.submitted && counts[r.result_id] >= 2).map(shape));
      }
      return out({ error: "Not found." }, 404);
    } catch (e) {
      return out({ error: String(e && e.message || e) }, 500);
    }
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var import_strip_cf_connecting_ip_header3 = __toESM(require_strip_cf_connecting_ip_header());
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
var import_strip_cf_connecting_ip_header4 = __toESM(require_strip_cf_connecting_ip_header());
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-BI7rOR/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// node_modules/wrangler/templates/middleware/common.ts
var import_strip_cf_connecting_ip_header6 = __toESM(require_strip_cf_connecting_ip_header());
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-BI7rOR/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
