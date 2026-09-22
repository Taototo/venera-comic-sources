/** @type {import('../_venera_.js')} */
class PrivateTianyaVideo extends ComicSource {
  type = "video";
  name = "天涯资源（私人）";
  key = "private_tianya_video";
  version = "1.4.0";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/tianya_video.js";

  settings = {
    api: {
      title: "JSON 接口",
      type: "select",
      options: [
        {
          value: "https://ty.tyyszy5.com/api.php/provide/vod/",
          text: "大陆优先线路",
        },
        {
          value: "https://tyyszyapi.com/api.php/provide/vod/",
          text: "天涯主线路",
        },
      ],
      default: "https://ty.tyyszy5.com/api.php/provide/vod/",
    },
    web: {
      title: "网页筛选地址",
      type: "input",
      default: "https://tyyszy.com",
    },
  };

  get apiUrl() {
    let value = this.loadSetting("api") || this.settings.api.default;
    value = String(value).trim();
    if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
    return value.replace(/[?&]+$/, "");
  }

  get webUrl() {
    let value = this.loadSetting("web") || this.settings.web.default;
    value = String(value).trim();
    if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
    return value.replace(/\/+$/, "");
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 12; K) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
      Accept: "application/json,text/plain,*/*",
      Referer: "https://tyyszy.com/",
    };
  }

  isSportsText(value) {
    return /体育赛事|体育|赛事直播|足球|篮球|斯诺克|网球|台球|排球|棒球|冰球|乒乓|羽毛球|电竞赛事/i.test(
      String(value || "")
    );
  }

  isSportsTypeId(value) {
    return ["48", "49", "50", "52"].includes(String(value || "").trim());
  }

  isSportsItem(item) {
    return this.isSportsTypeId(item && item.type_id) ||
      this.isSportsTypeId(item && item.type_pid) ||
      this.isSportsText(item && item.type_name);
  }

  requestUrl(params) {
    let query = Object.keys(params)
      .map((key) => `${key}=${encodeURIComponent(params[key])}`)
      .join("&");
    return `${this.apiUrl}?${query}`;
  }

  async request(params) {
    let res = await Network.get(this.requestUrl(params), this.headers);
    if (res.status !== 200) throw `天涯资源接口状态异常: ${res.status}`;
    let text = String(res.body || "").trim();
    if (!text || text[0] !== "{") throw "天涯资源返回了无法解析的数据";
    let data;
    try {
      data = JSON.parse(text);
    } catch (_) {
      throw "天涯资源返回了无效 JSON";
    }
    if (data.code !== undefined && Number(data.code) !== 1) {
      throw data.msg || "天涯资源接口返回错误";
    }
    return data;
  }

  htmlDecode(value) {
    return String(value || "")
      .replace(/&nbsp;|&#160;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (_, code) => {
        let value = String(code);
        let radix = value[0].toLowerCase() === "x" ? 16 : 10;
        let number = parseInt(value.replace(/^x/i, ""), radix);
        return Number.isFinite(number) ? String.fromCharCode(number) : "";
      });
  }

  text(value) {
    return this.htmlDecode(String(value || "").replace(/<[^>]*>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
  }

  attr(block, name) {
    let match = String(block || "").match(
      new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i")
    );
    return match ? this.htmlDecode(match[1]) : "";
  }

  innerText(block, className) {
    let match = String(block || "").match(
      new RegExp(`<[^>]*class=["'][^"']*${className}[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, "i")
    );
    return match ? this.text(match[1]) : "";
  }

  parseWebList(html) {
    let cards = [];
    let blocks = String(html || "").match(
      /<a\b[^>]*class=["'][^"']*movie-card[^"']*["'][^>]*>[\s\S]*?<\/a>/gi
    ) || [];
    for (let block of blocks) {
      let idMatch = block.match(/\/vod\/detail\/id\/(\d+)\.html/i);
      if (!idMatch) continue;
      let title = this.attr(block, "data-name") || this.innerText(block, "movie-name");
      let cover = this.attr(block, "data-src") || this.attr(block, "src");
      let category = this.innerText(block, "movie-category");
      let status = this.innerText(block, "episode-status");
      let update = this.innerText(block, "update-time");
      if (!title || this.isSportsText(`${category} ${title}`)) continue;
      let subtitle = [category, status, update].filter((value) => value).join(" · ");
      cards.push({
        id: String(idMatch[1]),
        title: title,
        cover: cover,
        subtitle: subtitle,
        update: update,
      });
    }
    let maxPage = 1;
    let pages = String(html || "").match(/(?:\/page\/|page\/)(\d+)(?:\/|\.)/gi) || [];
    for (let page of pages) {
      let match = page.match(/(\d+)/);
      if (match) maxPage = Math.max(maxPage, Number(match[1]));
    }
    return {
      comics: cards.map((item) => new Comic({
        id: item.id,
        title: item.title,
        subTitle: item.subtitle,
        cover: item.cover,
        description: item.update,
      })),
      records: cards,
      maxPage: maxPage,
    };
  }

  webRegion(value) {
    return {
      "中国大陆": "大陆",
      "中国香港": "香港",
      "中国台湾": "台湾",
    }[String(value)] || String(value);
  }

  webOptions(options) {
    let values = Array.isArray(options) ? options : [];
    let valueAt = (index) => {
      let value = values[index];
      return value && String(value) !== "all" ? String(value) : "";
    };
    return {
      year: valueAt(0),
      rating: valueAt(1),
      sort: valueAt(2),
      genre: valueAt(3),
      region: valueAt(4),
    };
  }

  webShowPath(typeId, page, options) {
    let filters = this.webOptions(options);
    let parts = [];
    let sort = String(filters.sort || "").match(/^(time|year|score)\.(desc|asc)$/);
    if (sort) parts.push(`by/${sort[1]}/order/${sort[2]}`);
    if (filters.region) parts.push(`area/${encodeURIComponent(this.webRegion(filters.region))}`);
    if (filters.genre) parts.push(`class/${encodeURIComponent(filters.genre)}`);
    parts.push(`id/${encodeURIComponent(String(typeId))}`);
    // The public page supports exact years. Decade choices remain visible in
    // the app, but are not converted into a misleading single-year request.
    if (/^\d{4}$/.test(filters.year)) parts.push(`year/${filters.year}`);
    if (Number(page) > 1) parts.push(`page/${Number(page)}`);
    return `/index.php/vod/show/${parts.join("/")}.html`;
  }

  async enrichWebRecords(records) {
    let result = await Promise.all((records || []).map(async (record) => {
      try {
        let data = await this.request({ ac: "detail", ids: record.id });
        let item = Array.isArray(data.list) ? data.list[0] : null;
        return Object.assign({}, record, {
          year: Number(item && item.vod_year) || 0,
          score: Number(item && (item.vod_score || item.vod_douban_score)) || 0,
        });
      } catch (_) {
        return Object.assign({}, record, { year: 0, score: 0 });
      }
    }));
    return result;
  }

  async loadWebList(typeId, page, options) {
    let url = `${this.webUrl}${this.webShowPath(typeId, page, options)}`;
    let res = await Network.get(url, Object.assign({}, this.headers, {
      Accept: "text/html,application/xhtml+xml",
      Referer: `${this.webUrl}/`,
    }));
    if (res.status !== 200) throw `天涯网页筛选状态异常: ${res.status}`;
    let result = this.parseWebList(res.body);
    let filters = this.webOptions(options);
    let records = result.records || [];
    let needsDetails = Boolean(filters.rating) || /s$/i.test(filters.year || "") ||
      /^(year|score)\.(?:desc|asc)$/.test(filters.sort || "");
    if (needsDetails) records = await this.enrichWebRecords(records);
    if (/^\d{4}s$/i.test(filters.year || "")) {
      let start = Number(String(filters.year).substring(0, 4));
      records = records.filter((record) => record.year >= start && record.year <= start + 9);
    }
    if (filters.rating) {
      let minimum = Number(filters.rating);
      records = records.filter((record) => record.score >= minimum);
    }
    if (filters.sort === "year.asc") records.sort((a, b) => a.year - b.year);
    if (filters.sort === "year.desc") records.sort((a, b) => b.year - a.year);
    if (filters.sort === "score.asc") records.sort((a, b) => a.score - b.score);
    if (filters.sort === "score.desc") records.sort((a, b) => b.score - a.score);
    result.comics = records.map((item) => new Comic({
      id: item.id,
      title: item.title,
      subTitle: item.subtitle,
      cover: item.cover,
      description: item.update,
    }));
    return result;
  }

  async loadWebSearch(keyword, page) {
    let encoded = encodeURIComponent(String(keyword || "").trim());
    let pageNumber = Math.max(1, Number(page) || 1);
    let path = `/index.php/vod/search/page/${pageNumber}/wd/${encoded}.html`;
    let res = await Network.get(`${this.webUrl}${path}`, Object.assign({}, this.headers, {
      Accept: "text/html,application/xhtml+xml",
      Referer: `${this.webUrl}/`,
    }));
    if (res.status !== 200) throw `天涯网页搜索状态异常: ${res.status}`;
    return this.parseWebList(res.body);
  }

  toComic(item) {
    if (this.isSportsItem(item) || !item || item.vod_id === undefined || !item.vod_name) return null;
    let subtitle = [item.type_name, item.vod_year, item.vod_remarks]
      .filter((value) => value && String(value).trim())
      .join(" · ");
    return new Comic({
      id: String(item.vod_id),
      title: String(item.vod_name),
      subTitle: subtitle,
      cover: String(item.vod_pic || item.vod_pic_thumb || ""),
      description: String(item.vod_blurb || item.vod_content || subtitle),
    });
  }

  parseList(data) {
    let comics = [];
    for (let item of Array.isArray(data.list) ? data.list : []) {
      let comic = this.toComic(item);
      if (comic) comics.push(comic);
    }
    let maxPage = parseInt(data.pagecount, 10) || 1;
    return { comics: comics, maxPage: maxPage };
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
      params.year = /^\d{4}s$/i.test(year)
        ? `${year.substring(0, 4)}-${Number(year.substring(0, 4)) + 9}`
        : year;
    }
    let rating = valueAt(1);
    if (rating) params.vod_score = rating;
    let sort = valueAt(2);
    if (sort) params.order = sort;
    let genre = valueAt(3);
    if (genre) params.class = genre;
    let region = valueAt(4);
    if (region) params.area = region;
    return params;
  }

  async loadList(typeId, page, keyword, options) {
    if (this.isSportsTypeId(typeId)) return { comics: [], maxPage: 1 };
    if (keyword) {
      return this.loadWebSearch(keyword, page);
    }
    if (typeId && typeId !== "__latest") {
      try {
        return await this.loadWebList(typeId, page, options);
      } catch (_) {
        // Keep the JSON endpoint as a fallback when the public web template
        // is temporarily unavailable.
      }
    }
    let params = { ac: "list", pg: Number(page) || 1 };
    if (typeId) params.t = typeId;
    if (keyword) params.wd = keyword;
    Object.assign(params, this.parseFilterOptions(options));
    return this.parseList(await this.request(params));
  }

  extractEntries(item) {
    let groups = String(item && item.vod_play_url || "").split("$$$");
    let playFrom = String(item && item.vod_play_from || "").split("$$$");
    let grouped = {};
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
      let group = groups[groupIndex];
      let route = (playFrom[groupIndex] || "").trim() ||
        (groups.length > 1 ? `线路${groupIndex + 1}` : "默认线路");
      let chapters = grouped[route] || {};
      for (let entry of group.split("#")) {
        let separator = entry.indexOf("$");
        if (separator < 0) continue;
        let label = entry.substring(0, separator).trim() || "播放";
        let url = entry.substring(separator + 1).trim();
        if (!/^https?:\/\//i.test(url)) continue;
        if (!/\.(?:m3u8|mp4)(?:[?#]|$)/i.test(url)) continue;
        if (!chapters[url]) chapters[url] = label;
      }
      if (Object.keys(chapters).length > 0) grouped[route] = chapters;
    }
    if (Object.keys(grouped).length === 1) return grouped[Object.keys(grouped)[0]];
    return grouped;
  }

  chapterCount(chapters) {
    let count = 0;
    for (let key of Object.keys(chapters || {})) {
      let value = chapters[key];
      count += value && typeof value === "object" ? Object.keys(value).length : 1;
    }
    return count;
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
      title: "天涯资源",
      type: "multiPartPage",
      load: async () => {
        let sections = [
          ["最新更新", "__latest"],
          ["电影", "1"],
          ["电视剧", "2"],
          ["综艺", "3"],
          ["动漫", "4"],
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
    title: "天涯资源",
    // 具体体裁由视频页的统一高级筛选处理；这些是天涯接口实际支持的
    // 顶部分类及其 type_id，避免把二级分类混入顶部导航。
    parts: [{
      name: "主要大分类",
      type: "fixed",
      categories: ["最新更新", "电影", "电视剧", "动漫", "综艺", "短剧"],
      itemType: "category",
      categoryParams: ["__latest", "1", "2", "4", "3", "54"],
    }],
    enableRankingPage: false,
  };

  categoryComics = {
    load: async (category, param, options, page) =>
      this.loadList(String(param || ""), page || 1, "", options),
  };

  search = {
    load: async (keyword, options, page) => {
      // The published JSON API does not implement wd search; use the site's
      // HTML search endpoint instead.
      return this.loadWebSearch(keyword, page || 1);
    },
    optionList: [],
  };

  comic = {
    onThumbnailLoad: (url) => ({
      url: url,
      headers: this.headers,
    }),

    loadInfo: async (id) => {
      let data = await this.request({ ac: "detail", ids: String(id) });
      let item = Array.isArray(data.list) ? data.list[0] : null;
      if (!item) throw "天涯资源没有找到该视频";
      if (this.isSportsItem(item)) throw "该视频属于已屏蔽的体育赛事分类";
      let chapters = this.extractEntries(item);
      let tags = [item.type_name, item.vod_area, item.vod_year]
        .filter((value) => value && String(value).trim());
      return new ComicDetails({
        title: String(item.vod_name || "天涯资源"),
        subTitle: String(item.vod_remarks || ""),
        cover: String(item.vod_pic || ""),
        description: String(item.vod_content || item.vod_blurb || ""),
        tags: { 类型: tags },
        chapters: chapters,
        url: this.requestUrl({ ac: "detail", ids: String(id) }),
        maxPage: this.chapterCount(chapters),
      });
    },

    loadEp: async (comicId, epId) => {
      let candidate = String(epId || "");
      let videoUrl = this.extractStream(candidate);
      if (!videoUrl) {
        let res = await Network.get(candidate, this.headers);
        if (res.status !== 200) throw `天涯资源播放页状态异常: ${res.status}`;
        videoUrl = this.extractStream(res.body);
      }
      if (!videoUrl) throw "天涯资源当前集数没有可用的视频地址";
      return {
        images: [
          `venera-video:${JSON.stringify({
            url: videoUrl,
            title: "天涯资源",
            headers: this.headers,
          })}`,
        ],
      };
    },
  };
}
