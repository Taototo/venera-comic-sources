/** @type {import('../_venera_.js')} */
class PrivateJuliangVideo extends ComicSource {
  type = "video";
  name = "巨量资源（私人）";
  key = "private_juliang_video";
  version = "1.1.0";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/juliang_video.js";

  settings = {
    portal: {
      title: "网页筛选接口",
      type: "input",
      default: "https://juliang.app/api/portal/preview",
    },
    api: {
      title: "备用 JSON 接口",
      type: "input",
      default: "https://api.juliang.live/api/provide/vod/",
    },
  };

  get portalUrl() {
    let value = this.loadSetting("portal") || this.settings.portal.default;
    value = String(value).trim();
    if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
    return value.replace(/[?&/]+$/, "");
  }

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
      Referer: "https://juliang.app/library",
    };
  }

  queryUrl(base, params) {
    let values = Object.keys(params || {}).filter(
      (key) => params[key] !== undefined && params[key] !== null && params[key] !== ""
    );
    if (values.length === 0) return base;
    let query = values
      .map((key) => `${key}=${encodeURIComponent(params[key])}`)
      .join("&");
    return `${base}${base.includes("?") ? "&" : "?"}${query}`;
  }

  portalRequestUrl(path, params) {
    return this.queryUrl(`${this.portalUrl}/${path.replace(/^\/+/, "")}`, params);
  }

  async portalRequest(path, params) {
    let res = await Network.get(this.portalRequestUrl(path, params || {}), this.headers);
    if (res.status !== 200) throw `巨量网页接口状态异常: ${res.status}`;
    let text = String(res.body || "").trim();
    if (!text || text[0] !== "{") throw "巨量网页接口返回了无法解析的数据";
    let payload;
    try {
      payload = JSON.parse(text);
    } catch (_) {
      throw "巨量网页接口返回了无效 JSON";
    }
    if (payload.ok !== true || payload.data === undefined || payload.data === null) {
      let message = payload.error && (payload.error.message || payload.error.detail);
      throw message || "巨量网页接口返回错误";
    }
    return payload.data;
  }

  requestUrl(params) {
    return this.queryUrl(this.apiUrl, params);
  }

  async request(params) {
    let res = await Network.get(this.requestUrl(params), this.headers);
    if (res.status !== 200) throw `巨量 JSON 接口状态异常: ${res.status}`;
    let text = String(res.body || "").trim();
    if (!text || text[0] !== "{") throw "巨量 JSON 接口返回了无法解析的数据";
    // IDs may be larger than JavaScript's safe integer range.
    text = text.replace(
      /("(?:vod_id|emp_content_id)"\s*:\s*)(\d+)/g,
      '$1"$2"'
    );
    let data;
    try {
      data = JSON.parse(text);
    } catch (_) {
      throw "巨量 JSON 接口返回了无效 JSON";
    }
    if (data.code !== undefined && Number(data.code) !== 1) {
      throw data.msg || "巨量 JSON 接口返回错误";
    }
    return data;
  }

  toPortalComic(item) {
    if (!item || item.contentId === undefined || !item.title) return null;
    let details = [
      item.categoryName,
      item.releaseYear,
      item.voteAverage ? `评分 ${item.voteAverage}` : "",
    ].filter((value) => value !== undefined && value !== null && String(value).trim());
    let tags = [item.categoryName, item.contentTypeCode]
      .filter((value) => value && String(value).trim())
      .map((value) => String(value));
    return new Comic({
      id: String(item.contentId),
      title: String(item.title),
      subTitle: details.join(" · "),
      cover: String(item.posterUrl || ""),
      description: String(item.overview || details.join(" · ")),
      tags: tags,
    });
  }

  toJsonComic(item) {
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

  parsePortalList(data, size) {
    let comics = [];
    for (let item of Array.isArray(data.list) ? data.list : []) {
      let comic = this.toPortalComic(item);
      if (comic) comics.push(comic);
    }
    let total = Number(data.total) || comics.length;
    return {
      comics: comics,
      maxPage: Math.max(1, Math.ceil(total / (Number(size) || 20))),
    };
  }

  parseJsonList(data) {
    let comics = [];
    for (let item of Array.isArray(data.list) ? data.list : []) {
      let comic = this.toJsonComic(item);
      if (comic) comics.push(comic);
    }
    return {
      comics: comics,
      maxPage: parseInt(data.pagecount, 10) || 1,
    };
  }

  parseFilterOptions(options) {
    let values = Array.isArray(options) ? options : [];
    let valueAt = (index) => {
      let value = values[index];
      return value && String(value) !== "all" ? String(value) : "";
    };
    let params = {};
    let year = valueAt(0);
    if (year) {
      if (/^\d{4}s$/i.test(year)) {
        let start = Number(year.substring(0, 4));
        params.yearFrom = start;
        params.yearTo = start + 9;
      } else if (/^\d{4}$/.test(year)) {
        params.year = year;
      }
    }
    let rating = valueAt(1);
    if (rating) params.ratingMin = Number(rating);
    let sort = valueAt(2);
    if (sort) params.sort = sort;
    let genre = valueAt(3);
    if (genre) params.genre = genre;
    let region = valueAt(4);
    if (region) params.region = region;
    let language = valueAt(5);
    if (language) params.language = language;
    return params;
  }

  async loadPortalList(category, page, keyword, options) {
    let size = 20;
    let params = {
      page: Number(page) || 1,
      size: size,
    };
    if (category === "__today") {
      params.updated = "today";
    } else if (category) {
      params.category = String(category);
    }
    if (keyword) params.keyword = String(keyword).trim();
    Object.assign(params, this.parseFilterOptions(options));
    return this.parsePortalList(await this.portalRequest("contents", params), size);
  }

  async loadList(typeId, page, keyword, options) {
    try {
      return await this.loadPortalList(String(typeId || ""), page, keyword, options);
    } catch (portalError) {
      // Keep the source usable if the public web portal is temporarily down.
      let params = { ac: "list", pg: Number(page) || 1 };
      if (typeId && typeId !== "__today") params.t = typeId;
      if (keyword) params.wd = keyword;
      return this.parseJsonList(await this.request(params));
    }
  }

  async loadFilterOptions() {
    let data = await this.portalRequest("categories", {});
    let options = (items, emptyLabel) => {
      let result = [`all-${emptyLabel}`];
      for (let item of Array.isArray(items) ? items : []) {
        if (!item || !item.code || !item.name) continue;
        result.push(`${item.code}-${item.name}`);
      }
      return result;
    };
    let currentYear = new Date().getFullYear();
    let years = [`all-全部`];
    for (let i = 0; i < 6; i++) {
      let year = currentYear - i;
      years.push(`${year}-${year}`);
    }
    for (let decade of [2020, 2010, 2000, 1990, 1980, 1970, 1960]) {
      years.push(`${decade}s-${decade}年代`);
    }
    return [
      { label: "年份", options: years },
      {
        label: "评分",
        options: ["all-全部", "6-6 分以上", "7-7 分以上", "8-8 分以上", "9-9 分以上"],
      },
      {
        label: "排序",
        options: [
          "vote_average.desc-评分从高到低",
          "activated_at.desc-最近更新",
          "activated_at.asc-最早更新",
          "release_year.desc-上映年份从新到旧",
          "release_year.asc-上映年份从旧到新",
          "vote_average.asc-评分从低到高",
        ],
      },
      { label: "体裁", options: options(data.genreOptions, "全部") },
      { label: "地区", options: options(data.regionOptions, "全部") },
      { label: "语言", options: options(data.languageOptions, "全部") },
    ];
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

  portalChapters(item) {
    let grouped = {};
    let units = Array.isArray(item && item.units) ? item.units : [];
    for (let index = 0; index < units.length; index++) {
      let unit = units[index] || {};
      let episode = String(
        unit.title || unit.episodeNumber || `第 ${index + 1} 集`
      ).trim();
      let lines = Array.isArray(unit.lines) ? unit.lines : [];
      for (let line of lines) {
        let url = String(line && line.url || "").trim();
        if (!/^https?:\/\//i.test(url)) continue;
        let route = String(
          line.displayName || line.lineCode || "播放"
        ).trim() || "播放";
        if (!grouped[route]) grouped[route] = {};
        if (!grouped[route][url]) grouped[route][url] = episode;
      }
      if (lines.length === 0 && /^https?:\/\//i.test(String(unit.playerUrl || ""))) {
        if (!grouped["网页播放"]) grouped["网页播放"] = {};
        grouped["网页播放"][String(unit.playerUrl)] = episode;
      }
    }
    if (Object.keys(grouped).length === 0 && item && item.playerUrl) {
      grouped["网页播放"] = { [String(item.playerUrl)]: "播放" };
    }
    return grouped;
  }

  chapterCount(chapters) {
    let count = 0;
    for (let key of Object.keys(chapters || {})) {
      count += Object.keys(chapters[key] || {}).length;
    }
    return count;
  }

  async loadPortalInfo(id) {
    return this.portalRequest(`contents/${encodeURIComponent(String(id))}`, {});
  }

  explore = [
    {
      title: "巨量资源",
      type: "multiPartPage",
      load: async () => {
        let sections = [
          ["今日更新", "__today"],
          ["电影", "1"],
          ["电视剧", "2"],
          ["动漫", "3"],
          ["综艺", "4"],
          ["短剧", "5"],
          ["AI制作", "7"],
          ["体育赛事", "6"],
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
        name: "今日更新",
        type: "fixed",
        categories: ["今日更新"],
        itemType: "category",
        categoryParams: ["__today"],
      },
      {
        name: "电影",
        type: "fixed",
        categories: ["电影", "动作片", "喜剧片", "爱情片", "科幻片", "恐怖片", "剧情片", "悬疑片", "惊悚片", "犯罪片", "奇幻片", "冒险片", "战争片", "历史片", "灾难片", "纪录片", "动画片", "家庭片", "音乐片", "西部片", "电视电影", "影视解说", "预告片", "伦理片", "写真热舞", "4K电影", "其他电影"],
        itemType: "category",
        categoryParams: ["1", "101", "102", "103", "104", "105", "106", "107", "108", "109", "110", "111", "112", "113", "114", "115", "116", "117", "118", "119", "120", "121", "122", "190", "191", "192", "199"],
      },
      {
        name: "电视剧",
        type: "fixed",
        categories: ["电视剧", "内地剧", "香港剧", "台湾剧", "韩剧", "日剧", "欧美剧", "东南亚剧", "纪录剧集", "其他剧集"],
        itemType: "category",
        categoryParams: ["2", "201", "202", "203", "204", "205", "206", "207", "208", "299"],
      },
      {
        name: "动漫",
        type: "fixed",
        categories: ["动漫", "中国动漫", "日本动漫", "欧美动漫", "韩国动漫", "少儿动漫", "动画电影", "漫剧", "其他动漫"],
        itemType: "category",
        categoryParams: ["3", "301", "302", "303", "304", "305", "306", "307", "399"],
      },
      {
        name: "综艺",
        type: "fixed",
        categories: ["综艺", "大陆综艺", "香港综艺", "台湾综艺", "韩国综艺", "日本综艺", "欧美综艺", "演唱会", "其他综艺"],
        itemType: "category",
        categoryParams: ["4", "401", "402", "403", "404", "405", "406", "407", "499"],
      },
      {
        name: "短剧",
        type: "fixed",
        categories: ["短剧", "古装仙侠短剧", "年代穿越短剧", "脑洞悬疑短剧", "现代都市短剧", "女频恋爱短剧", "反转爽剧", "其他短剧"],
        itemType: "category",
        categoryParams: ["5", "501", "502", "503", "504", "505", "506", "599"],
      },
      {
        name: "体育赛事",
        type: "fixed",
        categories: ["体育赛事", "足球", "篮球", "台球", "其他赛事", "网球"],
        itemType: "category",
        categoryParams: ["6", "601", "602", "603", "604", "605"],
      },
      {
        name: "AI制作",
        type: "fixed",
        categories: ["AI制作", "AI漫剧"],
        itemType: "category",
        categoryParams: ["7", "701"],
      },
    ],
    enableRankingPage: false,
  };

  categoryComics = {
    load: async (category, param, options, page) =>
      this.loadList(String(param || ""), page || 1, "", options),
    optionLoader: async () => this.loadFilterOptions(),
  };

  search = {
    load: async (keyword, options, page) => {
      let value = String(keyword || "").trim();
      if (!value) return { comics: [], maxPage: 1 };
      return this.loadPortalList("", page || 1, value, options);
    },
    optionList: [],
  };

  comic = {
    onThumbnailLoad: (url) => ({
      url: url,
      headers: this.headers,
    }),

    loadInfo: async (id) => {
      try {
        let item = await this.loadPortalInfo(id);
        let chapters = this.portalChapters(item);
        let tags = [];
        for (let value of [
          item.categoryName,
          item.releaseYear,
          item.voteAverage ? `评分 ${item.voteAverage}` : "",
          ...(Array.isArray(item.genres) ? item.genres.slice(0, 5) : []),
        ]) {
          if (value !== undefined && value !== null && String(value).trim()) {
            tags.push(String(value));
          }
        }
        return new ComicDetails({
          title: String(item.title || "巨量资源"),
          subTitle: [item.categoryName, item.releaseYear]
            .filter((value) => value !== undefined && value !== null && String(value).trim())
            .join(" · "),
          cover: String(item.posterUrl || ""),
          description: String(item.overview || ""),
          tags: { 类型: tags },
          chapters: chapters,
          url: this.portalRequestUrl(`contents/${encodeURIComponent(String(id))}`, {}),
          maxPage: this.chapterCount(chapters),
        });
      } catch (portalError) {
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
      }
    },

    loadEp: async (comicId, epId) => {
      let candidate = String(epId || "").trim();
      let videoUrl = this.extractStream(candidate);
      if (!videoUrl && /^https?:\/\//i.test(candidate)) {
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
