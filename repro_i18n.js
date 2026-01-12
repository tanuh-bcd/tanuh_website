import i18next from 'i18next';

i18next.init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        obj: { a: 1 }
      }
    }
  }
});

const t = i18next.t;

const obj1 = t('obj', { returnObjects: true });
const obj2 = t('obj', { returnObjects: true });

console.log('obj1 === obj2:', obj1 === obj2);
