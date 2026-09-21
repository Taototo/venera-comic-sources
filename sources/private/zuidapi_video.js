/** @type {import('../_venera_.js')} */
class PrivateZuidApiVideo extends ComicSource {
  type = "video";
  name = "最大资源（私人）";
  key = "private_zuidapi_video";
  version = "1.0.0";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/zuidapi_video.js";

  _requestCache = new Map();
  _requestPending = new Map();

  settings = {
    api: {
      title: "JSON 接口",
      type: "select",
      options: [
        { value: "https://api.zuidapi.com/api.php/provide/vod/from/zuidam3u8/at/json/", text: "最大 m3u8 线路" },
        { value: "https://api.zuidapi.com/api.php/provide/vod/", text: "最大标准线路" },
      ],
      default: "https://api.zuidapi.com/api.php/provide/vod/from/zuidam3u8/at/json/",
    },
  };

  get apiUrl() {
    return String(this.loadSetting("api") || this.settings.api.default).trim().replace(/[?&]+$/, "");
  }

  get headers() {
    return {
      "User-Agent": "Mozilla/5.0 (Linux; Android 12; K) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
      Accept: "application/json,text/plain,*/*",
      Referer: "https://api.zuidapi.com/",
    };
  }

  requestUrl(params) {
    let query = Object.keys(params).map((key) => `${key}=${encodeURIComponent(params[key])}`).join("&");
    return `${this.apiUrl}${this.apiUrl.indexOf("?") >= 0 ? "&" : "?"}${query}`;
  }

  async request(params) {
    let url = this.requestUrl(params);
    let now = Date.now();
    let cached = this._requestCache.get(url);
    let ttl = params.ac === "detail" ? 30000 : 5000;
    if (cached && now - cached.time < ttl) return cached.data;
    let pending = this._requestPending.get(url);
    if (pending) return pending;
    let task = (async () => {
      let res = await Network.get(url, this.headers);
      if (res.status !== 200) throw `最大资源接口状态异常: ${res.status}`;
      let text = String(res.body || "").trim();
      if (!text || text[0] !== "{") throw "最大资源返回了无法解析的数据";
      text = text.replace(/("vod_id"\s*:\s*)(\d+)/g, '$1"$2"');
      let data;
      try { data = JSON.parse(text); } catch (_) { throw "最大资源返回了无效 JSON"; }
      if (data.code !== undefined && Number(data.code) !== 1) throw data.msg || "最大资源接口返回错误";
      this._requestCache.set(url, { time: Date.now(), data: data });
      return data;
    })();
    this._requestPending.set(url, task);
    try { return await task; } finally { this._requestPending.delete(url); }
  }

  clean(value) {
    return String(value || "").replace(/\\\//g, "/").replace(/\\u0026/gi, "&").replace(/\\u003d/gi, "=").trim();
  }

  extractStream(value) {
    let text = this.clean(value);
    let match = text.match(/https?:\/\/[^"'<>\\\s]+?(?:\.m3u8|\.mp4)(?:\?[^"'<>\\\s]*)?/i);
    return match ? match[0].replace(/[),;]+$/, "") : "";
  }

  toComic(item) {
    if (!item || item.vod_id === undefined || !item.vod_name) return null;
    let id = String(item.vod_id);
    let subtitle = [item.type_name, item.vod_year, item.vod_remarks].filter((v) => v && String(v).trim()).join(" · ");
    return new Comic({ id: id, title: String(item.vod_name), subTitle: subtitle, cover: this.clean(item.vod_pic || item.vod_pic_thumb || item.vod_pic_slide), description: String(item.vod_blurb || item.vod_content || subtitle) });
  }

  parseList(data) {
    let comics = [];
    for (let item of Array.isArray(data.list) ? data.list : []) {
      let comic = this.toComic(item);
      if (comic) comics.push(comic);
    }
    return { comics: comics, maxPage: parseInt(data.pagecount, 10) || 1 };
  }

  async loadList(typeId, page, keyword) {
    let params = { ac: "list", pg: Number(page) || 1 };
    if (typeId) params.t = typeId;
    if (keyword) params.wd = keyword;
    return this.parseList(await this.request(params));
  }

  extractEntries(item) {
    let chapters = new Map();
    let groups = String(item && item.vod_play_url || "").split("$$$");
    let routes = String(item && item.vod_play_from || "").split("$$$");
    for (let i = 0; i < groups.length; i++) {
      let route = routes[i] ? routes[i].trim() : "";
      for (let entry of groups[i].split("#")) {
        let value = this.clean(entry);
        if (!value) continue;
        let separator = value.indexOf("$");
        let label = separator >= 0 ? value.substring(0, separator).trim() : "播放";
        let raw = separator >= 0 ? value.substring(separator + 1).trim() : value;
        let url = this.extractStream(raw) || (/^https?:\/\//i.test(raw) ? raw : "");
        if (!url) continue;
        if (route && routes.length > 1) label = `${route} · ${label || "播放"}`;
        if (!chapters.has(url)) chapters.set(url, label || "播放");
      }
    }
    return chapters;
  }

  categoryPart(name, entries) {
    return { name: name, type: "fixed", categories: entries.map((e) => e[0]), itemType: "category", categoryParams: entries.map((e) => String(e[1])) };
  }

  explore = [{
    title: "最大资源",
    type: "multiPartPage",
    load: async () => {
      let sections = [["最新更新", ""], ["电影", "1"], ["电视剧", "2"], ["综艺", "3"], ["动漫", "4"], ["短剧", "68"]];
      let result = await Promise.all(sections.map(async (section) => {
        try { let page = await this.loadList(section[1], 1); return page.comics.length ? { title: section[0], comics: page.comics } : null; } catch (_) { return null; }
      }));
      return result.filter((v) => v != null);
    },
  }];

  category = {
    title: "最大资源",
    parts: [
      this.categoryPart("主要分类", [["最新更新", ""], ["电影", 1], ["电视剧", 2], ["综艺", 3], ["动漫", 4], ["伦理片", 5], ["体育", 47], ["短剧", 68]]),
      this.categoryPart("电影类型", [["动作片", 6], ["喜剧片", 7], ["爱情片", 8], ["科幻片", 9], ["恐怖片", 10], ["剧情片", 11], ["战争片", 12], ["纪录片", 20]]),
      this.categoryPart("剧集与动漫", [["国产剧", 13], ["欧美剧", 14], ["韩剧", 15], ["日剧", 16], ["国产动漫", 29], ["日韩动漫", 30], ["欧美动漫", 31]]),
      this.categoryPart("短剧", [["现代都市", 69], ["脑洞悬疑", 66], ["年代穿越", 67], ["古装仙侠", 68], ["反转爽剧", 65], ["女频恋爱", 64]]),
    ],
    enableRankingPage: false,
  };

  categoryComics = { load: async (category, param, options, page) => this.loadList(String(param || ""), page || 1), optionList: [] };
  search = { load: async (keyword, options, page) => { let value = String(keyword || "").trim(); return value ? this.loadList("", page || 1, value) : { comics: [], maxPage: 1 }; }, optionList: [] };

  comic = {
    onThumbnailLoad: (url) => ({ headers: this.headers }),
    loadInfo: async (id) => {
      let data = await this.request({ ac: "detail", ids: String(id) });
      let item = Array.isArray(data.list) ? data.list[0] : null;
      if (!item) throw "最大资源没有找到该视频";
      let chapters = this.extractEntries(item);
      let tags = [item.type_name, item.vod_area, item.vod_year].filter((v) => v && String(v).trim());
      return new ComicDetails({ title: String(item.vod_name || "最大资源"), subTitle: String(item.vod_remarks || ""), cover: this.clean(item.vod_pic || item.vod_pic_thumb || item.vod_pic_slide), description: String(item.vod_content || item.vod_blurb || ""), tags: { 类型: tags }, chapters: chapters, url: this.requestUrl({ ac: "detail", ids: String(id) }), maxPage: chapters.size });
    },
    loadEp: async (comicId, epId) => {
      let candidate = String(epId || "");
      let videoUrl = this.extractStream(candidate);
      if (!videoUrl && /^https?:\/\//i.test(candidate)) {
        let res = await Network.get(candidate, this.headers);
        if (res.status === 200) videoUrl = this.extractStream(res.body);
      }
      if (!videoUrl) throw "最大资源当前集数没有可用的视频地址";
      return { images: [`venera-video:${JSON.stringify({ url: videoUrl, title: "最大资源", headers: this.headers })}`] };
    },
  };
}
