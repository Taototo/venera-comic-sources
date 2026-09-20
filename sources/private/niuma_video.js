/** @type {import('../_venera_.js')} */
class PrivateNiumaVideo extends ComicSource {
  type = "video";
  name = "牛马影院（私人）";
  key = "private_niuma_video";
  version = "1.0.0";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/niuma_video.js";

  settings = {
    domain: {
      title: "站点域名",
      type: "input",
      default: "https://www.dlitv.com",
    },
  };

  get baseUrl() {
    let value = this.loadSetting("domain") || this.settings.domain.default;
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

  attribute(node, name) {
    if (!node) return "";
    return (node.attributes && node.attributes[name]) || "";
  }

  textOf(node) {
    return node && node.text ? String(node.text).replace(/\s+/g, " ").trim() : "";
  }

  cleanText(value) {
    return String(value || "")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\\u0026/gi, "&")
      .replace(/\\u003d/gi, "=")
      .replace(/\\u002F/gi, "/")
      .replace(/\\\//g, "/")
      .replace(/\\"/g, '"')
      .trim();
  }

  metaValue(body, name) {
    let key = String(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    let text = String(body || "");
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

  pageUrl(path, page) {
    let current = Number(page) || 1;
    let value = String(path || "/");
    if (current <= 1) return this.absoluteUrl(value);
    let group = value.match(/^(\/group\/\d+)-\d+(\.html)$/i);
    if (group) return this.absoluteUrl(`${group[1]}-${current}${group[2]}`);
    if (value.indexOf("/pick/") === 0 || value.indexOf("/label/") === 0) {
      return this.absoluteUrl(
        `${value.replace(/\.html$/i, "").replace(/\/+$/, "")}/page/${current}.html`
      );
    }
    return this.absoluteUrl(`/group/1-${current}.html`);
  }

  parsePageCount(document) {
    let maxPage = 1;
    for (let link of document.querySelectorAll("a[href]")) {
      let href = this.attribute(link, "href");
      let match = href.match(/\/group\/\d+-(\d+)\.html/i);
      if (!match) match = href.match(/\/page\/(\d+)\.html/i);
      if (match) maxPage = Math.max(maxPage, parseInt(match[1], 10));
      let text = this.textOf(link).match(/\d+\s*\/\s*(\d+)/);
      if (text) maxPage = Math.max(maxPage, parseInt(text[1], 10));
    }
    return maxPage;
  }

  parseCard(item) {
    let link = item.querySelector("a.iqy-vodlist__thumb[href*='/item/']") ||
      item.querySelector("a[href*='/item/']");
    if (!link) return null;
    let href = this.attribute(link, "href");
    let titleNode = item.querySelector(".iqy-vodlist__detail h4 a") || link;
    let title = this.attribute(titleNode, "title") || this.textOf(titleNode);
    let image = item.querySelector("img");
    let cover = this.attribute(image, "data-original") ||
      this.attribute(image, "data-src") ||
      this.attribute(image, "src");
    let subtitle = this.textOf(item.querySelector(".iqy-vodlist__detail .text"));
    if (!href || !title) return null;
    return new Comic({
      id: href,
      title: title,
      subTitle: subtitle,
      cover: this.absoluteUrl(cover),
      description: subtitle,
    });
  }

  parseComics(document) {
    let comics = [];
    let seen = {};
    for (let item of document.querySelectorAll("li")) {
      let comic = this.parseCard(item);
      if (!comic || seen[comic.id]) continue;
      seen[comic.id] = true;
      comics.push(comic);
    }
    return comics;
  }

  async loadList(path, page) {
    let res = await Network.get(this.pageUrl(path, page), this.headers);
    if (res.status !== 200) throw `Invalid status code: ${res.status}`;
    let document = new HtmlDocument(res.body);
    let result = {
      comics: this.parseComics(document),
      maxPage: this.parsePageCount(document),
    };
    document.dispose();
    return result;
  }

  explore = [
    {
      title: "牛马影院",
      type: "multiPartPage",
      load: async () => {
        let sections = [
          ["最新电影", "/group/1-1.html"],
          ["最新电视剧", "/group/2-1.html"],
          ["最新动漫", "/group/4-1.html"],
          ["最新短剧", "/group/24-1.html"],
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
    title: "牛马影院",
    parts: [
      {
        name: "频道",
        type: "fixed",
        categories: ["电影", "电视剧", "综艺", "动漫", "短剧", "热门排行", "最近更新"],
        itemType: "category",
        categoryParams: [
          "/group/1-1.html",
          "/group/2-1.html",
          "/group/3-1.html",
          "/group/4-1.html",
          "/group/24-1.html",
          "/label/hot.html",
          "/label/new.html",
        ],
      },
      {
        name: "电影筛选",
        type: "fixed",
        categories: ["全部电影", "动作片", "喜剧片", "科幻片", "美国电影", "2012年电影"],
        itemType: "category",
        categoryParams: [
          "/pick/id/1.html",
          "/pick/class/动作/id/1.html",
          "/pick/class/喜剧/id/1.html",
          "/pick/class/科幻/id/1.html",
          "/pick/area/美国/id/1.html",
          "/pick/year/2012/id/1.html",
        ],
      },
    ],
    enableRankingPage: false,
  };

  categoryComics = {
    load: async (category, param, options, page) =>
      this.loadList(param || "/group/1-1.html", page || 1),
    optionList: [],
  };

  search = {
    load: async (keyword, options, page) => {
      let value = String(keyword || "").trim();
      if (!value) return { comics: [], maxPage: 1 };
      let current = Number(page) || 1;
      let path = current <= 1
        ? `/hunt/wd/${encodeURIComponent(value)}.html`
        : `/hunt/page/${current}/wd/${encodeURIComponent(value)}.html`;
      return this.loadList(path, 1);
    },
    optionList: [],
  };

  parseDetail(document, id, url) {
    let title = this.textOf(document.querySelector(".iqy-content__detail h1")) ||
      this.textOf(document.querySelector("h1.title"));
    let image = document.querySelector(".iqy-content__thumb img");
    let cover = this.attribute(image, "data-original") ||
      this.attribute(image, "data-src") ||
      this.attribute(image, "src");
    let description = this.textOf(document.querySelector("#desc .content"));
    if (!description) {
      let meta = document.querySelector('meta[name="description"]');
      description = this.attribute(meta, "content");
    }
    let chapters = new Map();
    let links = document.querySelectorAll("a.btn[href*='/part/']");
    if (links.length === 0) links = document.querySelectorAll("a[href*='/part/']");
    for (let link of links) {
      let href = this.attribute(link, "href");
      let label = this.textOf(link) || "播放";
      if (href) chapters.set(this.absoluteUrl(href), label);
    }
    let tags = [];
    for (let link of document.querySelectorAll(".iqy-content__detail .data a")) {
      let value = this.textOf(link);
      if (value && tags.indexOf(value) < 0) tags.push(value);
    }
    return new ComicDetails({
      title: title || "牛马影院",
      cover: this.absoluteUrl(cover),
      description: description,
      tags: { 标签: tags },
      chapters: chapters,
      url: url,
    });
  }

  extractStream(body) {
    let text = this.cleanText(body);
    let matches = text.match(
      /https?:\/\/[^"'<>\\\s]+?\.(?:m3u8|mp4)(?:\?[^"'<>\\\s]*)?/gi
    ) || [];
    return matches.length > 0 ? matches[0].replace(/[),;]+$/, "") : "";
  }

  comic = {
    loadInfo: async (id) => {
      let url = this.absoluteUrl(id);
      let res = await Network.get(url, this.headers);
      if (res.status !== 200) throw `Invalid status code: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let result = this.parseDetail(document, id, url);
      document.dispose();
      return result;
    },

    loadEp: async (comicId, epId) => {
      let url = this.absoluteUrl(epId || comicId);
      let res = await Network.get(url, { ...this.headers, Referer: url });
      if (res.status !== 200) throw `Invalid status code: ${res.status}`;
      let videoUrl = this.extractStream(res.body);
      if (!videoUrl) throw "牛马影院当前线路没有可用的视频地址";
      let title = this.metaValue(res.body, "og:title") || "牛马影院";
      return {
        images: [
          `venera-video:${JSON.stringify({
            url: videoUrl,
            title: title.replace(/全集.*$/i, "").trim(),
            headers: { ...this.headers, Referer: url },
          })}`,
        ],
      };
    },
  };
}
