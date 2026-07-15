import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  TextInput
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Button from '../../components/common/Button';

const HelpCenterScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState(null);

  const faqs = [
    {
      id: 1,
      question: 'How do I book a ride?',
      answer: 'Open the app, select your pickup location, destination, choose a vehicle type, and confirm your booking. You can track your driver in real-time.'
    },
    {
      id: 2,
      question: 'How do I cancel a ride?',
      answer: 'Go to your active ride, tap on "Cancel Ride" and confirm. Please note that cancellation fees may apply based on the timing.'
    },
    {
      id: 3,
      question: 'What payment methods are accepted?',
      answer: 'We accept Cash, Easypaisa, JazzCash, Raast, and Wallet payments. You can also save multiple payment methods in your account.'
    },
    {
      id: 4,
      question: 'How does carpooling work?',
      answer: 'Carpooling allows you to share a ride with others going in the same direction. You can book a seat instead of the whole vehicle, saving money.'
    },
    {
      id: 5,
      question: 'Is my ride insured?',
      answer: 'Yes, all rides are covered under our comprehensive insurance policy. In case of any incident, please contact our support team immediately.'
    }
  ];

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFaq = (id) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@raftar.com');
  };

  const handleCallSupport = () => {
    Linking.openURL('tel:+92123456789');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={24} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search help articles..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Quick Contact */}
      <View style={styles.quickContact}>
        <Text style={styles.quickContactTitle}>Need immediate help?</Text>
        <View style={styles.contactButtons}>
          <TouchableOpacity style={styles.contactButton} onPress={handleCallSupport}>
            <Icon name="phone" size={24} color="#FFF" />
            <Text style={styles.contactButtonText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactButton} onPress={handleContactSupport}>
            <Icon name="email" size={24} color="#FFF" />
            <Text style={styles.contactButtonText}>Email</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactButton}>
            <Icon name="chat" size={24} color="#FFF" />
            <Text style={styles.contactButtonText}>Chat</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* FAQs */}
      <View style={styles.faqSection}>
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        {filteredFaqs.length > 0 ? (
          filteredFaqs.map((faq) => (
            <TouchableOpacity
              key={faq.id}
              style={styles.faqItem}
              onPress={() => toggleFaq(faq.id)}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Icon
                  name={expandedFaq === faq.id ? 'expand-less' : 'expand-more'}
                  size={24}
                  color="#888"
                />
              </View>
              {expandedFaq === faq.id && (
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.noResults}>No results found</Text>
        )}
      </View>

      {/* Report Issue Button */}
      <Button
        title="Report an Issue"
        onPress={() => {}}
        variant="outline"
        size="large"
        style={styles.reportButton}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
  },
  quickContact: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  quickContactTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  contactButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  contactButton: {
    alignItems: 'center',
    gap: 8,
  },
  contactButtonText: {
    color: '#FFF',
    fontSize: 12,
  },
  faqSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  faqItem: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    padding: 16,
    marginBottom: 8,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    color: '#FFF',
    fontSize: 16,
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    color: '#888',
    fontSize: 14,
    marginTop: 12,
    lineHeight: 20,
  },
  noResults: {
    color: '#888',
    textAlign: 'center',
    paddingVertical: 20,
  },
  reportButton: {
    marginBottom: 30,
  },
});

export default HelpCenterScreen;