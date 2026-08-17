import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Styles pour le PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1E40AF',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 20,
  },
  table: {
    display: 'flex',
    width: '100%',
    marginTop: 20,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    borderBottomStyle: 'solid',
    paddingVertical: 8,
  },
  tableHeader: {
    backgroundColor: '#F3F4F6',
    fontWeight: 'bold',
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
    paddingHorizontal: 4,
  },
  tableCellRight: {
    flex: 1,
    fontSize: 10,
    paddingHorizontal: 4,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#1E40AF',
    borderTopStyle: 'solid',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
  footer: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 40,
    textAlign: 'center',
  },
});

type DevisPDFProps = {
  projectName: string;
  projectStatus: string;
  items: {
    name: string;
    quantity: number;
    price: number;
    tvaRate: number; // Taux de TVA appliqué (détecté)
    total: number;
  }[];
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
};

export default function DevisPDF({
  projectName,
  projectStatus,
  items,
  totalHT,
  totalTVA,
  totalTTC,
}: DevisPDFProps) {
  // Calcul du taux de TVA affiché (si des items existent, on prend le premier)
  const displayTvaRate = items.length > 0 ? items[0].tvaRate : 20;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* En-tête */}
        <Text style={styles.title}>📄 Devis</Text>
        <Text style={styles.subtitle}>
          Projet : {projectName} - Statut : {projectStatus}
        </Text>
        <Text style={[styles.subtitle, { marginTop: 4, fontSize: 10, color: '#6B7280' }]}>
          TVA appliquée : {displayTvaRate}%
        </Text>

        {/* Tableau */}
        <View style={styles.table}>
          {/* En-têtes du tableau */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, { flex: 2 }]}>Description</Text>
            <Text style={styles.tableCell}>Qté</Text>
            <Text style={styles.tableCell}>Prix HT</Text>
            <Text style={styles.tableCell}>TVA</Text>
            <Text style={styles.tableCellRight}>Total HT</Text>
          </View>

          {/* Lignes du tableau */}
          {items.map((item, index) => (
            <View style={styles.tableRow} key={index}>
              <Text style={[styles.tableCell, { flex: 2 }]}>{item.name}</Text>
              <Text style={styles.tableCell}>{item.quantity}</Text>
              <Text style={styles.tableCell}>{item.price.toFixed(2)} €</Text>
              <Text style={styles.tableCell}>{item.tvaRate}%</Text>
              <Text style={styles.tableCellRight}>{item.total.toFixed(2)} €</Text>
            </View>
          ))}
        </View>

        {/* Totaux */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total HT</Text>
          <Text style={styles.totalValue}>{totalHT.toFixed(2)} €</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TVA ({displayTvaRate}%)</Text>
          <Text style={styles.totalValue}>{totalTVA.toFixed(2)} €</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: '#1E40AF', fontSize: 16 }]}>Total TTC</Text>
          <Text style={[styles.totalValue, { color: '#1E40AF', fontSize: 16 }]}>
            {totalTTC.toFixed(2)} €
          </Text>
        </View>

        {/* Pied de page */}
        <Text style={styles.footer}>
          Devis généré par Aqil Bina - {new Date().toLocaleDateString()}
        </Text>
      </Page>
    </Document>
  );
}