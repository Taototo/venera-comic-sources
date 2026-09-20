/** @type {import('../_venera_.js')} */
class PrivateZip0Video extends ComicSource {
  type = "video";
  name = "ZIP0影视（私人）";
  key = "private_zip0_video";
  version = "1.0.4";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/zip0_video.js";

  settings = {
    domains: {
      title: "站点域名",
      type: "input",
      default: "https://zip0.com",
    },
  };

  get baseUrl() {
    let value = this.loadSetting("domains") || this.settings.domains.default;
    value = String(value).trim();
    if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
    return value.replace(/\/+$/, "");
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 12; K) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
      Referer: `${this.baseUrl}/`,
      Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
    };
  }

  absoluteUrl(value) {
    if (!value) return "";
    let text = String(value).trim();
    if (/^https?:\/\//i.test(text)) return text;
    if (text.indexOf("//") === 0) return `https:${text}`;
    return `${this.baseUrl}${text.indexOf("/") === 0 ? "" : "/"}${text}`;
  }

  cleanText(value) {
    return String(value || "")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#x2F;/gi, "/")
      .replace(/&#39;/g, "'")
      .replace(/\\u0022/gi, '"')
      .replace(/\\u003c/gi, "<")
      .replace(/\\u003e/gi, ">")
      .replace(/\\u0026/g, "&")
      .replace(/\\u003d/gi, "=")
      .replace(/\\u002F/gi, "/")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\")
      .replace(/\\\//g, "/")
      .trim();
  }

  safeDecode(value) {
    let result = String(value || "");
    for (let i = 0; i < 2; i++) {
      try {
        let decoded = decodeURIComponent(result);
        if (decoded === result) break;
        result = decoded;
      } catch (_) {
        break;
      }
    }
    return result
      .replace(/\\u0022/gi, '"')
      .replace(/\\u0026/gi, "&")
      .replace(/\\u003d/gi, "=")
      .replace(/\\u002F/gi, "/")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\")
      .replace(/\\\//g, "/")
      .replace(/[),;]+$/g, "");
  }

  metaValue(body, name) {
    let text = String(body || "");
    let key = String(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    let match = text.match(
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`,
        "i"
      )
    );
    if (!match) {
      match = text.match(
        new RegExp(
          `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${key}["']`,
          "i"
        )
      );
    }
    return match ? this.cleanText(match[1]) : "";
  }

  parseWatchRef(value) {
    let text = String(value || "").trim();
    let source = text.match(/[?&]source=([^&#]+)/i);
    let id = text.match(/[?&]id=([^&#]+)/i);
    if (source && id) {
      return {
        source: this.safeDecode(source[1]),
        id: this.safeDecode(id[1]),
      };
    }
    return null;
  }

  watchUrl(reference, episode) {
    let ep = parseInt(String(episode || "1"), 10) || 1;
    return `${this.baseUrl}/watch?source=${encodeURIComponent(
      reference.source
    )}&id=${encodeURIComponent(reference.id)}&episode=${ep}`;
  }

  parseEpisodeCount(body) {
    let text = String(body || "");
    let count = 0;
    let matches = text.match(/(\d+)\s*(?:<!--\s*-->\s*)?集/gi) || [];
    for (let value of matches) {
      let match = value.match(/\d+/);
      if (match) count = Math.max(count, parseInt(match[0], 10));
    }
    let buttons = text.match(/episode-picker__list[\s\S]{0,4000}/i);
    if (buttons) {
      let values = buttons[0].match(/<button[^>]*>\s*(\d+)\s*<\/button>/gi) || [];
      count = Math.max(count, values.length);
    }
    return count > 0 ? count : 1;
  }

  parseStream(body) {
    let text = this.cleanText(body);
    // ZIP0 is a Next.js page and the player URL has appeared under several
    // serialized field names over time. Prefer explicit media fields so an
    // image/CDN URL elsewhere on the page cannot win.
    let fields = text.match(
      /(?:playUrl|videoUrl|m3u8|mp4|source|src|file|url)\s*[:=]\s*["']([^"']+)["']/gi
    ) || [];
    let candidates = [];
    for (let field of fields) {
      let separator = field.indexOf(":");
      let value = separator >= 0 ? field.substring(separator + 1) : field;
      value = value.replace(/^[\s"'=:\\]+/, "").replace(/["']+$/, "");
      candidates.push(value);
    }

    // Keep this fallback deliberately permissive. Some responses escape the
    // slash as \/, omit the extension before a query string, or put the URL in
    // a <source> element rather than a JSON field.
    candidates = candidates.concat(
      text.match(/https?:\\?\/\\?\/[^"'<>\s]+/gi) || []
    );
    for (let value of candidates) {
      let candidate = this.safeDecode(value).replace(/[),;]+$/g, "");
      if (/\.(?:m3u8|mp4)(?:\?|$)/i.test(candidate)) return candidate;
    }
    return "";
  }

  attribute(node, name) {
    if (!node) return "";
    return (node.attributes && node.attributes[name]) || "";
  }

  textOf(node) {
    return node && node.text ? String(node.text).replace(/\s+/g, " ").trim() : "";
  }

  parseCategoryCard(item) {
    let link = item.querySelector("a.video-card__poster-link[href]") ||
      item.querySelector("a[href*='/watch']");
    if (!link) return null;
    let href = this.attribute(link, "href");
    let titleNode = item.querySelector("a.video-card__title") ||
      item.querySelector(".video-card__title");
    let title = this.textOf(titleNode) || this.attribute(link, "title");
    let image = item.querySelector("img.video-card__poster") || item.querySelector("img");
    let cover = this.attribute(image, "src") ||
      this.attribute(image, "data-src") ||
      this.attribute(image, "data-original");
    let subtitle = this.textOf(item.querySelector(".video-card__meta"));
    if (!href || !title) return null;
    return new Comic({
      id: this.absoluteUrl(href),
      title: title,
      subTitle: subtitle,
      cover: this.absoluteUrl(cover),
      description: subtitle,
    });
  }

  parseCategoryComics(document) {
    let comics = [];
    let seen = {};
    for (let item of document.querySelectorAll("article.video-card")) {
      let comic = this.parseCategoryCard(item);
      if (!comic || seen[comic.id]) continue;
      seen[comic.id] = true;
      comics.push(comic);
    }
    return comics;
  }

  pageCount(document) {
    let maxPage = 1;
    for (let node of document.querySelectorAll("a[href]")) {
      let href = this.attribute(node, "href");
      let match = href.match(/[?&]page=(\d+)/i);
      if (match) maxPage = Math.max(maxPage, parseInt(match[1], 10));
    }
    return maxPage;
  }

  async loadCategory(path, options, page) {
    let current = Number(page) || 1;
    let url = this.absoluteUrl(path);
    let keys = ["area", "year", "sort"];
    let params = [];
    for (let i = 0; i < keys.length; i++) {
      let value = options && options[i] ? String(options[i]) : "all";
      if (keys[i] === "area" && value === "hong_kong") value = "hong-kong";
      if (value && value !== "all") {
        params.push(keys[i] + "=" + encodeURIComponent(value));
      }
    }
    if (current > 1) {
      params.push("page=" + current);
    }
    if (params.length > 0) {
      url += (url.indexOf("?") >= 0 ? "&" : "?") + params.join("&");
    }
    let res = await this.request(url);
    if (res.status !== 200) throw `Invalid status code: ${res.status}`;
    let document = new HtmlDocument(res.body);
    let result = {
      comics: this.parseCategoryComics(document),
      maxPage: this.pageCount(document),
    };
    document.dispose();
    return result;
  }

  async coverForItem(item) {
    let direct = item.poster || item.cover || item.pic || item.image || item.thumb;
    if (direct) return this.absoluteUrl(direct);
    try {
      let res = await this.request(item.url);
      if (res.status === 200) {
        let cover = this.metaValue(res.body, "og:image") ||
          this.metaValue(res.body, "twitter:image");
        if (cover) return this.absoluteUrl(cover);
      }
    } catch (_) {}
    return this.absoluteUrl("/og.png");
  }

  async request(url) {
    return Network.get(url, this.headers);
  }

  async loadInfoByUrl(url) {
    let res = await this.request(url);
    if (res.status !== 200) throw `Invalid status code: ${res.status}`;
    let body = String(res.body || "");
    let title = this.metaValue(body, "og:title") || this.metaValue(body, "twitter:title");
    title = title.replace(/\s*在线播放.*$/i, "").trim() || "ZIP0影视";
    let cover = this.metaValue(body, "og:image") || this.absoluteUrl("/og.png");
    let description = this.metaValue(body, "og:description");
    let count = this.parseEpisodeCount(body);
    let chapters = new Map();
    for (let i = 1; i <= count; i++) chapters.set(String(i), `第${i}集`);
    return new ComicDetails({
      title: title,
      cover: cover,
      description: description,
      tags: {},
      chapters: chapters,
      url: url,
      maxPage: count,
    });
  }

  // The website home is a set of video sections rather than a single list.
  // Expose the same sections to the app so its video home page follows the
  // source configuration instead of showing a fixed local layout.
  explore = [
    {
      title: "首页",
      type: "multiPartPage",
      load: async () => {
        let sections = [
          ["最新电影", "/category/movie"],
          ["最新电视剧", "/category/tv"],
          ["最新综艺", "/category/variety"],
        ];
        let result = [];
        for (let section of sections) {
          try {
            let page = await this.loadCategory(section[1], [], 1);
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
    title: "ZIP0影视",
    parts: [
      {
        name: "频道",
        type: "fixed",
        categories: ["电影", "短剧", "电视剧", "综艺", "纪录片", "体育"],
        itemType: "category",
        categoryParams: [
          "/category/movie",
          "/category/short",
          "/category/tv",
          "/category/variety",
          "/category/documentary",
          "/category/sports",
        ],
      },
    ],
    enableRankingPage: false,
  };

  categoryComics = {
    load: async (category, param, options, page) => {
      return this.loadCategory(param || "/category/movie", options, page || 1);
    },
    optionList: [
      {
        label: "地区",
        options: [
          "all-全部地区",
          "mainland-大陆",
          "hong_kong-香港",
          "taiwan-台湾",
          "japan-日本",
          "korea-韩国",
          "western-欧美",
          "thailand-泰国",
          "india-印度",
          "other-其他",
        ],
      },
      {
        label: "年份",
        options: [
          "all-全部年份",
          "current-今年",
          "last-去年",
          "recent-近年",
          "2010s-2010年代",
          "2000s-2000年代",
          "1990s-90年代",
          "older-更早",
        ],
      },
      {
        label: "排序",
        options: ["updated-最近更新", "score-评分最高"],
      },
    ],
  };

  search = {
    load: async (keyword, options, page) => {
      let value = String(keyword || "").trim();
      if (!value) return { comics: [], maxPage: 1 };
      let current = Number(page) || 1;
      let url = `${this.baseUrl}/api/videos/search?query=${encodeURIComponent(
        value
      )}&page=${current}&limit=20`;
      let res = await this.request(url);
      if (res.status !== 200) throw `Invalid status code: ${res.status}`;
      let json;
      try {
        json = JSON.parse(res.body);
      } catch (_) {
        throw "ZIP0 返回了无法解析的搜索结果";
      }
      let list = Array.isArray(json.data) ? json.data : [];
      let comics = [];
      let items = await Promise.all(list.map(async (item) => {
        if (!item || !item.url || !item.title) return null;
        let subtitle = [item.year, item.category, item.remarks]
          .filter((v) => v && String(v).trim())
          .join(" · ");
        return {
          id: item.url,
          title: String(item.title),
          subTitle: subtitle,
          cover: await this.coverForItem(item),
          description: subtitle,
        };
      }));
      for (let item of items) {
        if (item) comics.push(new Comic(item));
      }
      let pages = json.pagination && parseInt(json.pagination.pages, 10);
      return { comics: comics, maxPage: pages > 0 ? pages : 1 };
    },
    optionList: [],
  };

  comic = {
    loadInfo: async (id) => {
      let reference = this.parseWatchRef(id);
      if (!reference) throw "ZIP0 漫画源缺少有效的播放引用";
      return this.loadInfoByUrl(this.watchUrl(reference, 1));
    },

    loadEp: async (comicId, epId) => {
      let reference = this.parseWatchRef(comicId);
      if (!reference) throw "ZIP0 漫画源缺少有效的播放引用";
      let episode = parseInt(String(epId || "1"), 10) || 1;
      let url = this.watchUrl(reference, episode);
      let res = await this.request(url);
      if (res.status !== 200) throw `Invalid status code: ${res.status}`;
      let body = String(res.body || "");
      let videoUrl = this.parseStream(body);
      if (!videoUrl) throw "ZIP0 当前集数没有可用的视频地址";
      let title = this.metaValue(body, "og:title").replace(/\s*在线播放.*$/i, "").trim();
      return {
        images: [
          `venera-video:${JSON.stringify({
            url: videoUrl,
            title: `${title || "ZIP0影视"} 第${episode}集`,
            headers: this.headers,
          })}`,
        ],
      };
    },
  };
}
