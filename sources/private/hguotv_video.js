/** @type {import('../_venera_.js')} */
class PrivateHguoTvVideo extends ComicSource {
  type = "video";
  name = "黄果漫剧（私人）";
  key = "private_hguotv_video";
  version = "1.0.0";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/hguotv_video.js";

  settings = {
    domain: {
      title: "站点地址",
      type: "input",
      default: "https://hguotv.com",
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
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      Referer: `${this.baseUrl}/`,
    };
  }

  absoluteUrl(value) {
    let text = String(value || "").trim();
    if (!text) return "";
    if (/^https?:\/\//i.test(text)) return text;
    if (text.startsWith("//")) return `https:${text}`;
    return `${this.baseUrl}${text.startsWith("/") ? "" : "/"}${text}`;
  }

  textOf(node) {
    return node && node.text ? String(node.text).replace(/\s+/g, " ").trim() : "";
  }

  attribute(node, name) {
    return node && node.attributes ? String(node.attributes[name] || "") : "";
  }

  parseComics(doc) {
    let result = [];
    let seen = {};
    for (let item of doc.querySelectorAll("article.shot")) {
      let link = item.querySelector("a.cover-link[href]");
      let titleNode = item.querySelector("h3") || link;
      let image = item.querySelector("img");
      if (!link || !titleNode) continue;
      let id = this.attribute(link, "href");
      let title = this.textOf(titleNode);
      let cover = image ? this.attribute(image, "src") : "";
      if (!id || !title || seen[id]) continue;
      seen[id] = true;
      let tags = this.attribute(item, "data-tags");
      result.push(new Comic({
        id: id,
        title: title,
        subTitle: tags,
        cover: this.absoluteUrl(cover),
        description: tags || "黄果漫剧",
      }));
    }
    return result;
  }

  async loadList(page) {
    let res = await Network.get(this.absoluteUrl("/"), this.headers);
    if (res.status !== 200) throw `黄果漫剧接口状态异常: ${res.status}`;
    let doc = new HtmlDocument(res.body);
    let comics = this.parseComics(doc);
    doc.dispose();
    return { comics: comics, maxPage: 1 };
  }

  explore = [{
    title: "黄果漫剧",
    type: "multiPartPage",
    load: async () => {
      let value = await this.loadList(1);
      return value.comics.length > 0 ? [{ title: "最新", comics: value.comics }] : [];
    },
  }];

  category = {
    title: "黄果漫剧",
    parts: [{
      name: "分类",
      type: "fixed",
      categories: ["最新", "AI短剧", "AI漫剧", "原创", "魔改", "真人短剧"],
      itemType: "category",
      categoryParams: ["/", "/", "/", "/", "/", "/"],
    }],
    enableRankingPage: false,
  };

  categoryComics = {
    load: async (category, param, options, page) => {
      let value = await this.loadList(page || 1);
      let wanted = String(category || "").trim();
      if (!wanted || wanted === "最新") return value;
      value.comics = value.comics.filter((comic) => String(comic.description || "").includes(wanted));
      return value;
    },
    optionList: [],
  };

  search = {
    load: async (keyword, options, page) => {
      let value = await this.loadList(page || 1);
      let wanted = String(keyword || "").trim().toLowerCase();
      value.comics = wanted
        ? value.comics.filter((comic) => comic.title.toLowerCase().includes(wanted))
        : [];
      return value;
    },
    optionList: [],
  };

  comic = {
    onThumbnailLoad: () => ({ headers: this.headers }),

    loadInfo: async (id) => {
      let url = this.absoluteUrl(id);
      let res = await Network.get(url, this.headers);
      if (res.status !== 200) throw `黄果漫剧详情状态异常: ${res.status}`;
      let doc = new HtmlDocument(res.body);
      let title = this.textOf(doc.querySelector("h1")) || "黄果漫剧";
      let image = doc.querySelector("meta[property='og:image']") || doc.querySelector("img");
      let cover = this.attribute(image, "content") || this.attribute(image, "src");
      let genre = this.textOf(doc.querySelector(".kicker"));
      doc.dispose();
      return new ComicDetails({
        title: title,
        cover: this.absoluteUrl(cover),
        description: "该站点详情页只提供跳转到官方 App 的播放入口，未公开网页视频地址。",
        tags: { 类型: genre ? [genre] : ["短剧"] },
        chapters: {},
        url: url,
        maxPage: 0,
      });
    },

    loadEp: async () => {
      throw "黄果漫剧未公开网页视频地址，请使用站点官方 App 播放";
    },
  };
}
