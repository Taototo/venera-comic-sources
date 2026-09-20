/** @type {import('../_venera_.js')} */
class PrivateTianyaVideo extends ComicSource {
  type = "video";
  name = "天涯资源（私人）";
  key = "private_tianya_video";
  version = "1.0.1";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/tianya_video.js";

  settings = {
    api: {
      title: "JSON 接口",
      type: "input",
      default: "https://tyyszyapi.com/api.php/provide/vod/",
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
      Referer: "https://tyyszy.com/",
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

  toComic(item) {
    if (!item || item.vod_id === undefined || !item.vod_name) return null;
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
      title: "天涯资源",
      type: "multiPartPage",
      load: async () => {
        let sections = [
          ["最新更新", ""],
          ["国产剧", "13"],
          ["电影", "1"],
          ["动漫", "29"],
          ["综艺", "25"],
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
    parts: [
      {
        name: "分类",
        type: "fixed",
        categories: [
          "最新更新",
          "电影",
          "电视剧",
          "综艺",
          "动漫",
          "动作片",
          "喜剧片",
          "爱情片",
          "科幻片",
          "恐怖片",
          "剧情片",
          "战争片",
          "国产剧",
          "欧美剧",
          "韩国剧",
          "日本剧",
          "港台剧",
          "台湾剧",
          "泰国剧",
          "纪录片",
          "海外剧",
          "大陆综艺",
          "日韩综艺",
          "港台综艺",
          "欧美综艺",
          "国产动漫",
          "日韩动漫",
          "欧美动漫",
          "动画片",
          "港台动漫",
          "海外动漫",
          "演唱会",
          "体育赛事",
          "篮球",
          "足球",
          "预告片",
          "斯诺克",
          "影视解说",
          "短剧",
          "伦理",
          "港台三级",
          "韩国伦理",
          "西方伦理",
          "日本伦理",
          "两性课堂",
          "写真热舞",
          "4K电影",
          "有声动漫",
          "女频恋爱",
          "反转爽剧",
          "古装仙侠",
          "年代穿越",
          "脑洞悬疑",
          "现代都市",
          "邵氏电影",
          "Netflix电影",
          "Netflix自制剧",
          "擦边短剧",
          "预告解说",
          "科普学习",
        ],
        itemType: "category",
        categoryParams: [
          "", "1", "2", "3", "4", "6", "7", "8", "9", "10", "11", "12",
          "13", "14", "15", "16", "17", "18", "19", "20", "23", "25", "26",
          "27", "28", "29", "30", "31", "39", "44", "45", "47", "48", "49",
          "50", "51", "52", "53", "54", "55", "56", "57", "58", "59", "60",
          "61", "62", "63", "64", "65", "66", "67", "68", "69", "70", "71",
          "72", "73", "74", "75",
        ],
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
      // The published Tianya API explicitly returns "暂不支持搜索" for wd.
      // Keep the source usable without turning that expected limitation into
      // a network error in the app.
      return { comics: [], maxPage: 1 };
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
        maxPage: chapters.size,
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
