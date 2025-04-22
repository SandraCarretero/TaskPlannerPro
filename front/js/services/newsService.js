const apiKey = '0d7ce95c70bb9da1380da4e02b5ab6be';
const baseUrl = 'https://gnews.io/api/v4/search';

export const newsService = {
  getTopNews: async (lang = 'es', country = 'es', max = 5) => {
    const url = `${baseUrl}?q=noticias&lang=${lang}&country=${country}&max=${max}&token=${apiKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Error al obtener las noticias');
      }

      const data = await response.json();
      return data.articles;
    } catch (error) {
      console.error('Error fetching GNews data:', error);
      return [];
    }
  },

  searchNews: async query => {
    const url = `https://gnews.io/api/v4/search?q=${query}&lang=es&country=es&max=4&token=0d7ce95c70bb9da1380da4e02b5ab6be`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Error al obtener noticias: ${response.statusText}`);
      }
      const data = await response.json();
      return data.articles;
    } catch (error) {
      console.error('Error al obtener datos de GNews:', error);
      throw new Error('Error al obtener las noticias');
    }
  }
};
