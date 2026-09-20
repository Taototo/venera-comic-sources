/** @type {import('../_venera_.js')} */
class PrivateJuliangVideo extends ComicSource {
  type = "video";
  name = "巨量资源（私人）";
  key = "private_juliang_video";
  version = "1.0.0";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/juliang_video.js";

  settings = {
    api: {
      title: "JSON 接口",
      type: "input",
      default: "https://api.juliang.live/api/provide/vod/",
    },
  };

  get apiUrl() {
    let value = this.loadSetting("api") || this.settings.api.default;
    value = String(value).trim();
    if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
    return value.replace(/[?&]+$/, "");
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 12; K) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
      Accept: "application/json,text/plain,*/*",
      Referer: "https://juliang.app/",
    };
  }

  requestUrl(params) {
    let query = Object.keys(params)
      .map((key) => `${key}=${encodeURIComponent(params[key])}`)
      .join("&");
    return `${this.apiUrl}?${query}`;
  }

  async request(params) {
    let res = await Network.get(this.requestUrl(params), this.headers);
    if (res.status !== 200) throw `巨量资源接口状态异常: ${res.status}`;
    let text = String(res.body || "").trim();
    if (!text || text[0] !== "{") throw "巨量资源返回了无法解析的数据";
    // IDs are larger than JavaScript's safe integer range. Quote those fields
    // before JSON.parse so detail requests keep the exact identifier.
    text = text.replace(
      /("(?:vod_id|emp_content_id)"\s*:\s*)(\d+)/g,
      '$1"$2"'
    );
    let data;
    try {
      data = JSON.parse(text);
    } catch (_) {
      throw "巨量资源返回了无效 JSON";
    }
    if (data.code !== undefined && Number(data.code) !== 1) {
      throw data.msg || "巨量资源接口返回错误";
    }
    return data;
  }

  toComic(item) {
    if (!item || item.vod_id === undefined || !item.vod_name) return null;
    let subtitle = [item.type_name, item.vod_year, item.vod_remarks]
      .filter((value) => value && String(value).trim())
      .join(" · ");
    return new Comic({
      id: String(item.vod_id),
      title: String(item.vod_name),
      subTitle: subtitle,
      cover: String(item.vod_pic || item.vod_pic_original || ""),
      description: String(item.vod_blurb || item.vod_content || subtitle),
    });
  }

  parseList(data) {
    let comics = [];
    for (let item of Array.isArray(data.list) ? data.list : []) {
      let comic = this.toComic(item);
      if (comic) comics.push(comic);
    }
    return {
      comics: comics,
      maxPage: parseInt(data.pagecount, 10) || 1,
    };
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
    for (let group of groups) {
      for (let entry of group.split("#")) {
        let separator = entry.indexOf("$");
        if (separator < 0) continue;
        let label = entry.substring(0, separator).trim() || "播放";
        let url = entry.substring(separator + 1).trim();
        if (!/^https?:\/\//i.test(url)) continue;
        if (!/\.(?:m3u8|mp4)(?:[?#]|$)/i.test(url)) continue;
        if (!chapters.has(url)) chapters.set(url, label);
      }
    }
    return chapters;
  }

  extractStream(value) {
    let text = String(value || "")
      .replace(/\\\//g, "/")
      .replace(/\\u0026/gi, "&")
      .replace(/\\u003d/gi, "=");
    let match = text.match(
      /https?:\/\/[^"'<>\\\s]+?\.(?:m3u8|mp4)(?:\?[^"'<>\\\s]*)?/i
    );
    return match ? match[0].replace(/[),;]+$/, "") : "";
  }

  explore = [
    {
      title: "巨量资源",
      type: "multiPartPage",
      load: async () => {
        let sections = [
          ["最新更新", ""],
          ["电影", "1"],
          ["电视剧", "2"],
          ["动漫", "3"],
          ["综艺", "4"],
          ["短剧", "5"],
        ];
        let result = [];
        for (let section of sections) {
          try {
            let page = await this.loadList(section[1], 1);
            if (page.comics.length > 0) {
              result.push({
                title: section[0],
                comics: page.comics,
                viewMore: `category:${section[0]}@${section[1]}`,
              });
            }
          } catch (_) {}
        }
        return result;
      },
    },
  ];

  category = {
    title: "巨量资源",
    parts: [
      {
        name: "分类",
        type: "fixed",
        categories: [
          "最新更新",
          "电影",
          "电视剧",
          "动漫",
          "综艺",
          "短剧",
          "体育赛事",
          "动作片",
          "内地剧",
          "中国动漫",
          "大陆综艺",
          "古装仙侠短剧",
          "足球",
        ],
        itemType: "category",
        categoryParams: ["", "1", "2", "3", "4", "5", "6", "101", "201", "301", "401", "501", "601"],
      },
    ],
    enableRankingPage: false,
  };

  categoryComics = {
    load: async (category, param, options, page) =>
      this.loadList(String(param || ""), page || 1),
    optionList: [],
  };

  search = {
    load: async (keyword, options, page) => {
      let value = String(keyword || "").trim();
      if (!value) return { comics: [], maxPage: 1 };
      return this.loadList("", page || 1, value);
    },
    optionList: [],
  };

  comic = {
    loadInfo: async (id) => {
      let data = await this.request({ ac: "detail", ids: String(id) });
      let item = Array.isArray(data.list) ? data.list[0] : null;
      if (!item) throw "巨量资源没有找到该视频";
      let chapters = this.extractEntries(item);
      let tags = [item.type_name, item.vod_area, item.vod_year]
        .filter((value) => value && String(value).trim());
      return new ComicDetails({
        title: String(item.vod_name || "巨量资源"),
        subTitle: String(item.vod_remarks || ""),
        cover: String(item.vod_pic || item.vod_pic_original || ""),
        description: String(item.vod_content || item.vod_blurb || ""),
        tags: { 类型: tags },
        chapters: chapters,
        url: this.requestUrl({ ac: "detail", ids: String(id) }),
        maxPage: chapters.size,
      });
    },

    loadEp: async (comicId, epId) => {
      let candidate = String(epId || "");
      let videoUrl = this.extractStream(candidate);
      if (!videoUrl) {
        let res = await Network.get(candidate, this.headers);
        if (res.status !== 200) throw `巨量资源播放页状态异常: ${res.status}`;
        videoUrl = this.extractStream(res.body);
      }
      if (!videoUrl) throw "巨量资源当前集数没有可用的视频地址";
      return {
        images: [
          `venera-video:${JSON.stringify({
            url: videoUrl,
            title: "巨量资源",
            headers: this.headers,
          })}`,
        ],
      };
    },
  };
}
